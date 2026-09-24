use hidapi::{HidApi, HidDevice};
use log::{debug, warn};
use serde::Serialize;
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

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HidDebugSnapshot {
    pub running: bool,
    pub host_connected: bool,
    pub device_handle_open: bool,
    pub poll_count: u64,
    pub command_count: u64,
    pub last_device_status: Option<String>,
    pub last_poll_at_ms: Option<u64>,
    pub last_read_size: Option<usize>,
    pub last_command_at_ms: Option<u64>,
    pub last_command: Option<String>,
    pub last_command_value: Option<String>,
    pub last_command_status: Option<String>,
    pub last_command_error: Option<String>,
    pub last_brightness: Option<u8>,
    pub last_display_on: Option<bool>,
    pub last_touch_pressed: Option<bool>,
    pub last_touch_x: Option<u16>,
    pub last_touch_y: Option<u16>,
    pub last_touch_z: Option<u16>,
}

/// Webview `eval` (used to deliver events to JS) must run on the main thread on macOS.
/// The HID poll loop runs on a background thread; emitting directly often fails silently (`let _ = emit`).
fn emit_to_webview(app: &AppHandle, event: &'static str, payload: serde_json::Value) {
    let scheduler = app.clone();
    let emitter = app.clone();
    if let Err(e) = scheduler.run_on_main_thread(move || {
        if let Err(err) = emitter.emit(event, payload) {
            warn!("emit {event} failed: {err}");
        }
    }) {
        warn!("schedule emit {event} on main thread failed: {e:?}");
    }
}

fn emit_device_status(
    app: &AppHandle,
    host_connected: &Arc<AtomicBool>,
    connected: bool,
    detail: Option<&str>,
) {
    host_connected.store(connected, Ordering::SeqCst);
    emit_to_webview(
        app,
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
    debug_snapshot: Arc<Mutex<HidDebugSnapshot>>,
}

impl HidConnection {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            device: Arc::new(Mutex::new(None)),
            host_connected: Arc::new(AtomicBool::new(false)),
            debug_snapshot: Arc::new(Mutex::new(HidDebugSnapshot::default())),
        }
    }

    pub fn start(&self, app: AppHandle) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }

        self.running.store(true, Ordering::SeqCst);
        self.update_debug_snapshot(|snapshot| {
            snapshot.running = true;
            snapshot.last_device_status = Some("Starting HID poll loop".into());
        });

        let running = self.running.clone();
        let device = self.device.clone();
        let host_connected = self.host_connected.clone();
        let debug_snapshot = self.debug_snapshot.clone();

        thread::spawn(move || {
            Self::poll_loop(app, running, device, host_connected, debug_snapshot);
        });
    }

    pub fn is_host_connected(&self) -> bool {
        self.host_connected.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        self.host_connected.store(false, Ordering::SeqCst);
        self.update_debug_snapshot(|snapshot| {
            snapshot.running = false;
            snapshot.host_connected = false;
            snapshot.device_handle_open = false;
            snapshot.last_device_status = Some("Stopped by app".into());
        });
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn debug_snapshot(&self) -> HidDebugSnapshot {
        let mut snapshot = self.debug_snapshot.lock().unwrap().clone();
        snapshot.running = self.is_running();
        snapshot.host_connected = self.is_host_connected();
        snapshot.device_handle_open = self
            .device
            .lock()
            .map(|device| device.is_some())
            .unwrap_or(false);
        snapshot
    }

    /// Send a raw command to the device, if connected.
    pub fn send_command(
        &self,
        command_name: &str,
        command_value: Option<String>,
        cmd: &[u8; 33],
    ) -> Result<(), String> {
        debug!(
            "send_command: {} value={:?} bytes={:02x?}",
            command_name, command_value, cmd
        );

        let lock = self.device.lock().map_err(|e| e.to_string())?;
        if let Some(ref dev) = *lock {
            match dev.write(cmd) {
                Ok(bytes_written) => {
                    self.update_debug_snapshot(|snapshot| {
                        snapshot.command_count += 1;
                        snapshot.last_command_at_ms = Some(now_ms());
                        snapshot.last_command = Some(command_name.to_string());
                        snapshot.last_command_value = command_value.clone();
                        snapshot.last_command_status =
                            Some(format!("write ok ({bytes_written} bytes)"));
                        snapshot.last_command_error = None;
                    });
                    Ok(())
                }
                Err(error) => {
                    let message = error.to_string();
                    self.update_debug_snapshot(|snapshot| {
                        snapshot.command_count += 1;
                        snapshot.last_command_at_ms = Some(now_ms());
                        snapshot.last_command = Some(command_name.to_string());
                        snapshot.last_command_value = command_value.clone();
                        snapshot.last_command_status = Some("write failed".into());
                        snapshot.last_command_error = Some(message.clone());
                    });
                    Err(message)
                }
            }
        } else {
            self.update_debug_snapshot(|snapshot| {
                snapshot.command_count += 1;
                snapshot.last_command_at_ms = Some(now_ms());
                snapshot.last_command = Some(command_name.to_string());
                snapshot.last_command_value = command_value;
                snapshot.last_command_status = Some("device unavailable".into());
                snapshot.last_command_error = Some("Device not connected".into());
            });
            Err("Device not connected".into())
        }
    }

    pub fn set_brightness(&self, brightness: u8) -> Result<(), String> {
        self.send_command(
            "set_brightness",
            Some(brightness.to_string()),
            &build_brightness_command(brightness),
        )
    }

    pub fn set_power(&self, on: bool) -> Result<(), String> {
        self.send_command(
            "set_power",
            Some(on.to_string()),
            &build_power_command(on),
        )
    }

    pub fn fill_display(&self, rgb565: u16) -> Result<(), String> {
        self.send_command(
            "fill_display",
            Some(format!("0x{rgb565:04x}")),
            &build_fill_display_command(rgb565),
        )
    }

    fn update_debug_snapshot(&self, update: impl FnOnce(&mut HidDebugSnapshot)) {
        if let Ok(mut snapshot) = self.debug_snapshot.lock() {
            update(&mut snapshot);
        }
    }

    fn update_shared_snapshot(
        shared_snapshot: &Arc<Mutex<HidDebugSnapshot>>,
        update: impl FnOnce(&mut HidDebugSnapshot),
    ) {
        if let Ok(mut snapshot) = shared_snapshot.lock() {
            update(&mut snapshot);
        }
    }

    fn set_debug_status(shared_snapshot: &Arc<Mutex<HidDebugSnapshot>>, detail: &str) {
        Self::update_shared_snapshot(shared_snapshot, |snapshot| {
            snapshot.last_device_status = Some(detail.to_string());
            snapshot.running = true;
        });
    }

    fn clear_device_handle(shared_snapshot: &Arc<Mutex<HidDebugSnapshot>>) {
        Self::update_shared_snapshot(shared_snapshot, |snapshot| {
            snapshot.device_handle_open = false;
            snapshot.host_connected = false;
        });
    }

    fn poll_loop(
        app: AppHandle,
        running: Arc<AtomicBool>,
        shared_device: Arc<Mutex<Option<HidDevice>>>,
        host_connected: Arc<AtomicBool>,
        debug_snapshot: Arc<Mutex<HidDebugSnapshot>>,
    ) {
        Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
            snapshot.running = true;
        });

        while running.load(Ordering::SeqCst) {
            let api = match HidApi::new() {
                Ok(api) => api,
                Err(e) => {
                    debug!("hidapi init failed: {e:?}");
                    Self::set_debug_status(
                        &debug_snapshot,
                        "HID API unavailable — check system USB/HID access",
                    );
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
                    Self::set_debug_status(&debug_snapshot, detail_msg);
                    emit_device_status(&app, &host_connected, false, Some(detail_msg));
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let hid_device = match info.open_device(&api) {
                Ok(d) => d,
                Err(e) => {
                    debug!("hid open failed: {e:?}");
                    Self::set_debug_status(
                        &debug_snapshot,
                        "Could not open device — in use by another app or permission denied",
                    );
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

            Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
                snapshot.device_handle_open = true;
                snapshot.last_device_status = Some("USB opened — waiting for device response".into());
            });

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
                    Self::set_debug_status(&debug_snapshot, "HID poll write failed");
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
                        Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
                            snapshot.poll_count += 1;
                            snapshot.last_poll_at_ms = Some(now_ms());
                            snapshot.last_read_size = Some(n);
                        });

                        if let Some(state) = parse_state_response(&buf) {
                            if !session_confirmed {
                                session_confirmed = true;
                                Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
                                    snapshot.host_connected = true;
                                    snapshot.last_device_status =
                                        Some("Polling confirmed from device".into());
                                });
                                emit_device_status(&app, &host_connected, true, None);
                            }

                            Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
                                snapshot.last_brightness = Some(state.brightness);
                                snapshot.last_display_on = Some(state.display_on);
                                snapshot.last_touch_pressed = Some(state.touch_pressed);
                                snapshot.last_touch_x = Some(state.touch_x);
                                snapshot.last_touch_y = Some(state.touch_y);
                                snapshot.last_touch_z = Some(state.touch_z);
                            });

                            emit_to_webview(
                                &app,
                                "glyf:display-state",
                                serde_json::json!({
                                    "on": state.display_on,
                                    "brightness": state.brightness
                                }),
                            );

                            if state.touch_pressed {
                                let pressure = state.touch_z as f32 / 4095.0;
                                emit_to_webview(
                                    &app,
                                    "glyf:touch-event",
                                    serde_json::json!({
                                        "pressed": true,
                                        "x": state.touch_x,
                                        "y": state.touch_y,
                                        "pressure": pressure,
                                        "timestamp": now_ms()
                                    }),
                                );
                            } else {
                                emit_to_webview(
                                    &app,
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
                        Self::set_debug_status(&debug_snapshot, &format!("HID read failed: {e}"));
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
            Self::clear_device_handle(&debug_snapshot);

            let detail = if session_confirmed {
                "USB session ended — unplugged or connection lost"
            } else {
                "USB opened but device did not answer HID polls"
            };
            Self::set_debug_status(&debug_snapshot, detail);
            emit_device_status(&app, &host_connected, false, Some(detail));
            thread::sleep(RECONNECT_INTERVAL);
        }

        Self::update_shared_snapshot(&debug_snapshot, |snapshot| {
            snapshot.running = false;
            snapshot.host_connected = false;
            snapshot.device_handle_open = false;
            snapshot.last_device_status = Some("HID poll loop exited".into());
        });
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
    let found = api
        .device_list()
        .any(|d| d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE);
    debug!("detect_device: found={found}");
    found
}
