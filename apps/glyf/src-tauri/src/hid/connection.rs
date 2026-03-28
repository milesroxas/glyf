use hidapi::{HidApi, HidDevice};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::protocol::{
    build_poll_request, parse_state_response, RAW_HID_REPORT_SIZE,
    build_brightness_command, build_power_command,
};

const VID: u16 = 0x4653;
const PID: u16 = 0x0003;
const USAGE_PAGE: u16 = 0xFF60;
const POLL_INTERVAL: Duration = Duration::from_millis(16); // ~60 Hz
const RECONNECT_INTERVAL: Duration = Duration::from_secs(2);

pub struct HidConnection {
    running: Arc<AtomicBool>,
    device: Arc<Mutex<Option<HidDevice>>>,
}

impl HidConnection {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            device: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, app: AppHandle) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let device = self.device.clone();

        thread::spawn(move || {
            Self::poll_loop(app, running, device);
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Send a raw command to the device, if connected.
    pub fn send_command(&self, cmd: &[u8; 33]) -> Result<(), String> {
        let lock = self.device.lock().map_err(|e| e.to_string())?;
        if let Some(ref dev) = *lock {
            dev.write(cmd).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn set_brightness(&self, brightness: u8) -> Result<(), String> {
        self.send_command(&build_brightness_command(brightness))
    }

    pub fn set_power(&self, on: bool) -> Result<(), String> {
        self.send_command(&build_power_command(on))
    }

    fn poll_loop(
        app: AppHandle,
        running: Arc<AtomicBool>,
        shared_device: Arc<Mutex<Option<HidDevice>>>,
    ) {
        while running.load(Ordering::SeqCst) {
            let api = match HidApi::new() {
                Ok(api) => api,
                Err(_) => {
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
                    let _ = app.emit(
                        "glyf:device-status",
                        serde_json::json!({ "connected": false }),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let hid_device = match info.open_device(&api) {
                Ok(d) => d,
                Err(_) => {
                    let _ = app.emit(
                        "glyf:device-status",
                        serde_json::json!({ "connected": false }),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            {
                let mut lock = shared_device.lock().unwrap();
                *lock = Some(hid_device);
            }

            let _ = app.emit(
                "glyf:device-status",
                serde_json::json!({ "connected": true }),
            );

            let request = build_poll_request();

            while running.load(Ordering::SeqCst) {
                let write_ok = {
                    let lock = shared_device.lock().unwrap();
                    lock.as_ref()
                        .map(|d| d.write(&request).is_ok())
                        .unwrap_or(false)
                };

                if !write_ok {
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
                    Err(_) => break,
                }

                thread::sleep(POLL_INTERVAL);
            }

            {
                let mut lock = shared_device.lock().unwrap();
                *lock = None;
            }
            let _ = app.emit(
                "glyf:device-status",
                serde_json::json!({ "connected": false }),
            );
            thread::sleep(RECONNECT_INTERVAL);
        }
    }
}

/// Check if a glyf device is visible on USB without connecting.
pub fn detect_device() -> bool {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(_) => return false,
    };
    let found = api.device_list().any(|d| {
        d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE
    });
    found
}
