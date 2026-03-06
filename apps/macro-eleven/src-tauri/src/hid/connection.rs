use hidapi::{HidApi, HidDevice};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::keymap_engine::KeymapEngine;
use super::protocol::{
    build_state_request, build_test_mode_command, parse_state_response, RAW_HID_REPORT_SIZE,
};

const VID: u16 = 0x4653;
const PID: u16 = 0x0002;
const USAGE_PAGE: u16 = 0xFF60;
const POLL_INTERVAL: Duration = Duration::from_millis(16); // ~60Hz
const RECONNECT_INTERVAL: Duration = Duration::from_secs(2);

pub struct HidConnection {
    running: Arc<AtomicBool>,
    device: Arc<Mutex<Option<HidDevice>>>,
    keymap_engine: Arc<Mutex<Option<Arc<KeymapEngine>>>>,
    desired_test_mode: Arc<AtomicBool>,
}

impl HidConnection {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            device: Arc::new(Mutex::new(None)),
            keymap_engine: Arc::new(Mutex::new(None)),
            desired_test_mode: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn set_test_mode(&self, enable: bool, app: &AppHandle) -> Result<(), String> {
        self.desired_test_mode.store(enable, Ordering::SeqCst);
        let result = {
            let device_lock = self.device.lock().map_err(|e| e.to_string())?;
            if let Some(ref dev) = *device_lock {
                Self::apply_test_mode(dev, enable)
            } else {
                Ok(())
            }
        };
        let _ = app.emit("macro11:test-mode", json!({ "enabled": enable }));
        result
    }

    pub fn start(&self, app: AppHandle) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let device = self.device.clone();
        let keymap_engine = self.keymap_engine.clone();
        let desired_test_mode = self.desired_test_mode.clone();

        thread::spawn(move || {
            Self::poll_loop(app, running, device, keymap_engine, desired_test_mode);
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    fn poll_loop(
        app: AppHandle,
        running: Arc<AtomicBool>,
        shared_device: Arc<Mutex<Option<HidDevice>>>,
        shared_engine: Arc<Mutex<Option<Arc<KeymapEngine>>>>,
        desired_test_mode: Arc<AtomicBool>,
    ) {
        // Initialize keymap engine
        let keymap_engine = match KeymapEngine::new(app.clone()) {
            Ok(engine) => {
                let engine = Arc::new(engine);
                {
                    let mut guard = shared_engine.lock().unwrap();
                    *guard = Some(engine.clone());
                }
                Some(engine)
            }
            Err(e) => {
                eprintln!("Failed to initialize keymap engine: {}", e);
                None
            }
        };

        while running.load(Ordering::SeqCst) {
            // Try to connect
            let api = match HidApi::new() {
                Ok(api) => api,
                Err(_) => {
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let device_info_opt = api.device_list().find(|d| {
                d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE
            });

            let device_info = match device_info_opt {
                Some(info) => info,
                None => {
                    let _ = app.emit(
                        "macro11:device-status",
                        serde_json::json!({ "connected": false }),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let hid_device = match device_info.open_device(&api) {
                Ok(d) => d,
                Err(_) => {
                    let _ = app.emit(
                        "macro11:device-status",
                        serde_json::json!({ "connected": false }),
                    );
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            // Ensure firmware macros stay disabled unless explicitly requested
            let should_enable_test_mode = desired_test_mode.load(Ordering::SeqCst);
            match Self::apply_test_mode(&hid_device, should_enable_test_mode) {
                Ok(()) => {
                    let _ = app.emit(
                        "macro11:test-mode",
                        json!({ "enabled": should_enable_test_mode }),
                    );
                }
                Err(e) => {
                    eprintln!("Failed to apply firmware test mode: {}", e);
                }
            }

            // Store device reference
            {
                let mut dev_lock = shared_device.lock().unwrap();
                *dev_lock = Some(hid_device);
            }

            let _ = app.emit(
                "macro11:device-status",
                serde_json::json!({ "connected": true }),
            );

            // Poll loop
            let request = build_state_request();
            while running.load(Ordering::SeqCst) {
                let write_result = {
                    let dev_lock = shared_device.lock().unwrap();
                    if let Some(ref dev) = *dev_lock {
                        dev.write(&request)
                    } else {
                        break;
                    }
                };

                if write_result.is_err() {
                    break;
                }

                let mut buf = [0u8; RAW_HID_REPORT_SIZE];
                let read_result = {
                    let dev_lock = shared_device.lock().unwrap();
                    if let Some(ref dev) = *dev_lock {
                        dev.read_timeout(&mut buf, 100)
                    } else {
                        break;
                    }
                };

                match read_result {
                    Ok(n) if n > 0 => {
                        if let Some(state) = parse_state_response(&buf) {
                            let key_state = state.keys;
                            let layer = state.layer;
                            let pot_value = state.pot_value;

                            // Emit legacy events before running host-side actions so UI feedback stays responsive
                            let key_snapshot: Vec<bool> = key_state.iter().copied().collect();
                            let _ = app.emit(
                                "macro11:key-event",
                                serde_json::json!({
                                    "keys": key_snapshot,
                                    "layer": layer
                                }),
                            );

                            let _ = app.emit(
                                "macro11:pot-value",
                                serde_json::json!({
                                    "value": pot_value,
                                    "layer": layer
                                }),
                            );

                            // Process keys through keymap engine if available
                            if let Some(engine) = &keymap_engine {
                                let host_actions_enabled = desired_test_mode.load(Ordering::SeqCst);
                                engine.process_key_state(&key_state, layer, host_actions_enabled);
                            }
                        }
                    }
                    Ok(_) => {}      // timeout, no data
                    Err(_) => break, // device disconnected
                }

                thread::sleep(POLL_INTERVAL);
            }

            // Device disconnected
            {
                let mut dev_lock = shared_device.lock().unwrap();
                *dev_lock = None;
            }
            let _ = app.emit(
                "macro11:device-status",
                serde_json::json!({ "connected": false }),
            );
            thread::sleep(RECONNECT_INTERVAL);
        }

        // Clear shared engine when loop exits
        let mut guard = shared_engine.lock().unwrap();
        *guard = None;
    }

    pub fn reload_keymap(&self) -> Result<(), String> {
        let guard = self.keymap_engine.lock().map_err(|e| e.to_string())?;
        if let Some(engine) = guard.as_ref() {
            engine.reload_keymap()
        } else {
            Err("Keymap engine not initialized. Connect the device first.".to_string())
        }
    }

    fn apply_test_mode(device: &HidDevice, enable: bool) -> Result<(), String> {
        let cmd = build_test_mode_command(enable);
        device.write(&cmd).map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Check if the device is currently visible on USB.
pub fn detect_device() -> bool {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(_) => return false,
    };
    let found = api
        .device_list()
        .any(|d| d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE);
    found
}
