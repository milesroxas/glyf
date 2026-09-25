use hidapi::{HidApi, HidDevice};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use super::keymap_engine::KeymapEngine;
use super::protocol::{
    build_info_request, build_state_request, build_test_mode_command, parse_info_response,
    parse_state_response, FirmwareInfo, RAW_HID_REPORT_SIZE,
};

const VID: u16 = 0x4653;
const PID: u16 = 0x0002;
const USAGE_PAGE: u16 = 0xFF60;
const POLL_INTERVAL: Duration = Duration::from_millis(16); // ~60Hz
const RECONNECT_INTERVAL: Duration = Duration::from_secs(2);
const PAUSED_INTERVAL: Duration = Duration::from_millis(50);
const RELEASE_TIMEOUT: Duration = Duration::from_secs(3);
/// Firmware without GET_INFO never answers; give up after this many reads.
const INFO_READ_ATTEMPTS: usize = 3;
const INFO_READ_TIMEOUT_MS: i32 = 100;

pub struct HidConnection {
    running: Arc<AtomicBool>,
    device: Arc<Mutex<Option<HidDevice>>>,
    keymap_engine: Arc<Mutex<Option<Arc<KeymapEngine>>>>,
    desired_test_mode: Arc<AtomicBool>,
    firmware_info: Arc<Mutex<Option<FirmwareInfo>>>,
    /// Set while a firmware update owns the device.
    paused: Arc<AtomicBool>,
    /// Set by the poll thread once it has let go of the device.
    parked: Arc<AtomicBool>,
}

/// Keeps the poll thread off the device while held. Firmware updates need
/// exclusive access (macOS hidapi opens devices exclusively). Dropping it
/// resumes polling.
pub struct PollSuspension {
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    parked: Arc<AtomicBool>,
}

impl PollSuspension {
    /// Block until the poll thread has released the device.
    pub fn wait_for_release(&self) {
        let deadline = Instant::now() + RELEASE_TIMEOUT;
        while self.running.load(Ordering::SeqCst)
            && !self.parked.load(Ordering::SeqCst)
            && Instant::now() < deadline
        {
            thread::sleep(PAUSED_INTERVAL);
        }
    }
}

impl Drop for PollSuspension {
    fn drop(&mut self) {
        self.paused.store(false, Ordering::SeqCst);
    }
}

impl HidConnection {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            device: Arc::new(Mutex::new(None)),
            keymap_engine: Arc::new(Mutex::new(None)),
            desired_test_mode: Arc::new(AtomicBool::new(true)),
            firmware_info: Arc::new(Mutex::new(None)),
            paused: Arc::new(AtomicBool::new(false)),
            parked: Arc::new(AtomicBool::new(true)),
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
        self.parked.store(false, Ordering::SeqCst);
        let running = self.running.clone();
        let device = self.device.clone();
        let keymap_engine = self.keymap_engine.clone();
        let desired_test_mode = self.desired_test_mode.clone();
        let firmware_info = self.firmware_info.clone();
        let paused = self.paused.clone();
        let parked = self.parked.clone();

        thread::spawn(move || {
            Self::poll_loop(
                app,
                running,
                device,
                keymap_engine,
                desired_test_mode,
                firmware_info,
                paused,
                parked,
            );
        });
    }

    /// Firmware info of the device the poll thread is connected to.
    pub fn connected_firmware(&self) -> Option<Option<FirmwareInfo>> {
        // Holding the device lock keeps the pair consistent: the poll thread
        // sets the info before storing the device and clears it after.
        let device = self.device.lock().ok()?;
        device.as_ref()?;
        Some(self.firmware_info.lock().ok().and_then(|info| *info))
    }

    pub fn is_connected(&self) -> bool {
        self.connected_firmware().is_some()
    }

    /// Ask the poll thread to release the device. Call `wait_for_release` on
    /// the result before opening the device elsewhere.
    pub fn suspend(&self) -> PollSuspension {
        self.paused.store(true, Ordering::SeqCst);
        PollSuspension {
            running: self.running.clone(),
            paused: self.paused.clone(),
            parked: self.parked.clone(),
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn poll_loop(
        app: AppHandle,
        running: Arc<AtomicBool>,
        shared_device: Arc<Mutex<Option<HidDevice>>>,
        shared_engine: Arc<Mutex<Option<Arc<KeymapEngine>>>>,
        desired_test_mode: Arc<AtomicBool>,
        firmware_info: Arc<Mutex<Option<FirmwareInfo>>>,
        paused: Arc<AtomicBool>,
        parked: Arc<AtomicBool>,
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

        // Last status sent to the frontend; windows ask for the current
        // status on mount, so only changes need an event
        let mut announced = None;

        while running.load(Ordering::SeqCst) {
            // Stay off the device while a firmware update runs
            if paused.load(Ordering::SeqCst) {
                parked.store(true, Ordering::SeqCst);
                thread::sleep(PAUSED_INTERVAL);
                continue;
            }
            parked.store(false, Ordering::SeqCst);

            // Try to connect
            let api = match HidApi::new() {
                Ok(api) => api,
                Err(_) => {
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            let hid_device = match open_device(&api) {
                Some(d) => d,
                None => {
                    announce_status(&app, &mut announced, false);
                    thread::sleep(RECONNECT_INTERVAL);
                    continue;
                }
            };

            *firmware_info.lock().unwrap() = query_firmware_info(&hid_device);

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

            announce_status(&app, &mut announced, true);

            // Poll loop
            let request = build_state_request();
            while running.load(Ordering::SeqCst) && !paused.load(Ordering::SeqCst) {
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
                            let key_snapshot: Vec<bool> = key_state.to_vec();
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

            // Device disconnected (or released for a firmware update)
            {
                let mut dev_lock = shared_device.lock().unwrap();
                *dev_lock = None;
            }
            *firmware_info.lock().unwrap() = None;
            announce_status(&app, &mut announced, false);
            if !paused.load(Ordering::SeqCst) {
                thread::sleep(RECONNECT_INTERVAL);
            }
        }

        parked.store(true, Ordering::SeqCst);

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

/// Emit `macro11:device-status` when the connection state changes.
fn announce_status(app: &AppHandle, announced: &mut Option<bool>, connected: bool) {
    if *announced != Some(connected) {
        *announced = Some(connected);
        let _ = app.emit("macro11:device-status", json!({ "connected": connected }));
    }
}

fn is_macro_eleven(d: &hidapi::DeviceInfo) -> bool {
    d.vendor_id() == VID && d.product_id() == PID && d.usage_page() == USAGE_PAGE
}

/// Open the device's Raw HID interface.
pub fn open_device(api: &HidApi) -> Option<HidDevice> {
    api.device_list()
        .find(|d| is_macro_eleven(d))?
        .open_device(api)
        .ok()
}

/// Ask the firmware for its version. `None` for firmware that predates the
/// GET_INFO command (it ignores the request).
pub fn query_firmware_info(device: &HidDevice) -> Option<FirmwareInfo> {
    device.write(&build_info_request()).ok()?;
    let mut buf = [0u8; RAW_HID_REPORT_SIZE];
    for _ in 0..INFO_READ_ATTEMPTS {
        match device.read_timeout(&mut buf, INFO_READ_TIMEOUT_MS) {
            // Skip replies to earlier requests still queued
            Ok(n) if n > 0 => {
                if let Some(info) = parse_info_response(&buf) {
                    return Some(info);
                }
            }
            Ok(_) => {}
            Err(_) => return None,
        }
    }
    None
}

/// Check if the device is currently visible on USB.
pub fn detect_device() -> bool {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(_) => return false,
    };
    let found = api.device_list().any(is_macro_eleven);
    found
}
