use hidapi::{HidApi, HidDevice};
use log::{debug, warn};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::protocol::{
    build_brightness_command, build_fill_display_command, build_poll_request, build_power_command,
    parse_state_response, RAW_HID_REPORT_SIZE,
};

const VID: u16 = 0x4653;
const PID: u16 = 0x0003;
const USAGE_PAGE: u16 = 0xFF60;
const POLL_INTERVAL: Duration = Duration::from_millis(16); // ~60 Hz
const RECONNECT_INTERVAL: Duration = Duration::from_secs(2);

fn emit_device_status(
    app: &AppHandle,
    host_connected: &Arc<AtomicBool>,
    connected: bool,
    detail: Option<&str>,
) {
    host_connected.store(connected, Ordering::SeqCst);
    let _ = app.emit(
        "glyf:device-status",
        serde_json::json!({
            "connected": connected,
            "detail": detail
        }),
    );
}

pub struct HidConnection {
    running: Arc<AtomicBool>,
    device: Arc<Mutex<Option<HidDevice>>>,
    /// Mirrors last `glyf:device-status` (for UI when events are delayed or blocked).
    host_connected: Arc<AtomicBool>,
}

impl HidConnection {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            device: Arc::new(Mutex::new(None)),
            host_connected: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self, app: AppHandle) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let device = self.device.clone();
        let host_connected = self.host_connected.clone();

        thread::spawn(move || {
            Self::poll_loop(app, running, device, host_connected);
        });
    }

    pub fn is_host_connected(&self) -> bool {
        self.host_connected.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        self.host_connected.store(false, Ordering::SeqCst);
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Send a raw command to the device, if connected.
    pub fn send_command(&self, cmd: &[u8; 33]) -> Result<(), String> {
        let lock = self.device.lock().map_err(|e| e.to_string())?;
        if let Some(ref dev) = *lock {
            dev.write(cmd).map_err(|e| e.to_string())?;
            return Ok(());
        }
        Err("Device not connected".into())
    }

    pub fn set_brightness(&self, brightness: u8) -> Result<(), String> {
        self.send_command(&build_brightness_command(brightness))
    }

    pub fn set_power(&self, on: bool) -> Result<(), String> {
        self.send_command(&build_power_command(on))
    }

    pub fn fill_display(&self, rgb565: u16) -> Result<(), String> {
        self.send_command(&build_fill_display_command(rgb565))
    }

    fn poll_loop(
        app: AppHandle,
        running: Arc<AtomicBool>,
        shared_device: Arc<Mutex<Option<HidDevice>>>,
        host_connected: Arc<AtomicBool>,
    ) {
        while running.load(Ordering::SeqCst) {
            let api = match HidApi::new() {
                Ok(api) => api,
                Err(e) => {
                    debug!("hidapi init failed: {e:?}");
                    emit_device_status(
                        &app,
                        &host_connected,
                        false,
                        Some("HID API unavailable — check system USB/HID access"),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let info = api.device_list().find(|d| {
                d.vendor_id() == VID
                    && d.product_id() == PID
                    && d.usage_page() == USAGE_PAGE
            });

            let info = match info {
                Some(i) => i,
                None => {
                    debug!(
                        "no glyf HID match (want VID={VID:04x} PID={PID:04x} usage_page={USAGE_PAGE:04x})"
                    );
                    let vid_pid = api.device_list().find(|d| {
                        d.vendor_id() == VID && d.product_id() == PID
                    });
                    let detail_msg: &'static str = match vid_pid {
                        None => "No glyf device on USB — check cable, port, and firmware",
                        Some(d) => {
                            debug!(
                                "same VID/PID, usage_page={:04x} path={:?}",
                                d.usage_page(),
                                d.path()
                            );
                            "USB device present but HID usage page is not 0xFF60 (descriptor mismatch)"
                        }
                    };
                    emit_device_status(&app, &host_connected, false, Some(detail_msg));
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let hid_device = match info.open_device(&api) {
                Ok(d) => d,
                Err(e) => {
                    debug!("hid open failed: {e:?}");
                    emit_device_status(
                        &app,
                        &host_connected,
                        false,
                        Some("Could not open device — in use by another app or permission denied"),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            {
                let mut lock = shared_device.lock().unwrap();
                *lock = Some(hid_device);
            }

            debug!("glyf HID opened, polling");
            emit_device_status(
                &app,
                &host_connected,
                false,
                Some("USB opened — waiting for device response"),
            );

            let request = build_poll_request();
            let mut session_confirmed = false;

            while running.load(Ordering::SeqCst) {
                let write_ok = {
                    let lock = shared_device.lock().unwrap();
                    lock.as_ref()
                        .map(|d| d.write(&request).is_ok())
                        .unwrap_or(false)
                };

                if !write_ok {
                    warn!("hid write failed, reconnecting");
                    break;
                }

                let mut buf = [0u8; RAW_HID_REPORT_SIZE];
                let read_result = {
                    let lock = shared_device.lock().unwrap();
                    lock.as_ref()
                        .map(|d| d.read_timeout(&mut buf, 100))
                        .unwrap_or(Err(hidapi::HidError::HidApiError {
                            message: "no device".into(),
                        }))
                };

                match read_result {
                    Ok(n) if n > 0 => {
                        if let Some(state) = parse_state_response(&buf) {
                            if !session_confirmed {
                                session_confirmed = true;
                                emit_device_status(&app, &host_connected, true, None);
                            }

                            let _ = app.emit(
                                "glyf:display-state",
                                serde_json::json!({
                                    "on": state.display_on,
                                    "brightness": state.brightness
                                }),
                            );

                            if state.touch_pressed {
                                let pressure = state.touch_z as f32 / 4095.0;
                                let _ = app.emit(
                                    "glyf:touch-event",
                                    serde_json::json!({
                                        "pressed": true,
                                        "x": state.touch_x,
                                        "y": state.touch_y,
                                        "pressure": pressure,
                                        "timestamp": std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis() as u64
                                    }),
                                );
                            } else {
                                let _ = app.emit(
                                    "glyf:touch-event",
                                    serde_json::json!({
                                        "pressed": false,
                                        "x": 0, "y": 0, "pressure": 0.0,
                                        "timestamp": 0u64
                                    }),
                                );
                            }
                        }
                    }
                    Ok(_) => {}
                    Err(e) => {
                        warn!("hid read failed: {e:?}");
                        break;
                    }
                }

                thread::sleep(POLL_INTERVAL);
            }

            {
                let mut lock = shared_device.lock().unwrap();
                *lock = None;
            }
            debug!("hid session ended, emitting disconnected");

            emit_device_status(
                &app,
                &host_connected,
                false,
                Some(if session_confirmed {
                    "USB session ended — unplugged or connection lost"
                } else {
                    "USB opened but device did not answer HID polls"
                }),
            );
            thread::sleep(RECONNECT_INTERVAL);
        }
    }
}

/// Check if a glyf device is visible on USB without connecting.
pub fn detect_device() -> bool {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(e) => {
            debug!("detect_device: hidapi init failed: {e:?}");
            return false;
        }
    };
    let found = api.device_list().any(|d| {
        d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE
    });
    debug!("detect_device: found={found}");
    found
}
