use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::hid::connection::{detect_device, HidConnection};

#[tauri::command]
pub fn detect_device_cmd() -> bool {
    detect_device()
}

#[tauri::command]
pub fn connect_device(app: AppHandle, connection: State<'_, Mutex<HidConnection>>) -> bool {
    let conn = connection.lock().unwrap();
    if conn.is_running() {
        return true;
    }
    conn.start(app);
    true
}

#[tauri::command]
pub fn disconnect_device(connection: State<'_, Mutex<HidConnection>>) {
    let conn = connection.lock().unwrap();
    conn.stop();
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
