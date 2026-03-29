use std::sync::Mutex;
use log::debug;
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
        debug!("connect_device: poll loop already running");
        return true;
    }
    debug!("connect_device: starting poll loop");
    conn.start(app);
    true
}

#[tauri::command]
pub fn disconnect_device(connection: State<'_, Mutex<HidConnection>>) {
    let conn = connection.lock().unwrap();
    debug!("disconnect_device: stopping poll loop");
    conn.stop();
}

#[tauri::command]
pub fn get_device_connection_snapshot(connection: State<'_, Mutex<HidConnection>>) -> bool {
    connection.lock().unwrap().is_host_connected()
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

#[tauri::command]
pub fn fill_display(
    rgb565: u16,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<(), String> {
    connection.lock().unwrap().fill_display(rgb565)
}
