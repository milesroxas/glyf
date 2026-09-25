use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::hid::connection::HidConnection;

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
