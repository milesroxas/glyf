use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::hid::connection::{detect_device, HidConnection};

#[tauri::command]
pub fn detect_device_cmd() -> bool {
    detect_device()
}

/// Whether the app is connected to the device. The app connects on its own
/// at launch and on replug; this gives windows the state on mount.
#[tauri::command]
pub fn get_device_status(connection: State<'_, Mutex<HidConnection>>) -> bool {
    let conn = connection.lock().unwrap();
    conn.is_connected()
}

#[tauri::command]
pub fn set_test_mode(
    app: AppHandle,
    enable: bool,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<(), String> {
    let conn = connection.lock().unwrap();
    conn.set_test_mode(enable, &app)
}

#[tauri::command]
pub fn reload_keymap(connection: State<'_, Mutex<HidConnection>>) -> Result<(), String> {
    let conn = connection.lock().unwrap();
    conn.reload_keymap()
}
