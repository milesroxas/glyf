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
pub fn set_display_brightness(
    brightness: u8,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<(), String> {
    connection.lock().unwrap().set_brightness(brightness)
}

#[tauri::command]
pub fn set_display_power(
    on: bool,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<(), String> {
    connection.lock().unwrap().set_power(on)
}
