mod commands;
mod config;
mod hid;

use std::sync::Mutex;

use config::{display_config::GlyfConfig, storage::load_config};
use hid::connection::HidConnection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(HidConnection::new()))
        .manage(Mutex::new(initial_config as GlyfConfig))
        .invoke_handler(tauri::generate_handler![
            commands::device::detect_device_cmd,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::set_display_brightness,
            commands::device::set_display_power,
            commands::display::get_display_config,
            commands::display::save_display_config,
            commands::display::reset_display_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
