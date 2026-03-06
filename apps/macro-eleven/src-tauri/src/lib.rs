mod commands;
mod config; // New keymap config system
mod executor;
mod hid;
mod keymap; // Legacy keymap parser (will be deprecated) // Action executor

use std::sync::Mutex;

use hid::connection::HidConnection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(HidConnection::new()))
        .invoke_handler(tauri::generate_handler![
            commands::device::detect_device_cmd,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::set_test_mode,
            commands::device::reload_keymap,
            commands::layers::get_layer_data,
            commands::overlay::open_overlay_window,
            commands::keymap_commands::get_active_keymap,
            commands::keymap_commands::save_user_keymap,
            commands::keymap_commands::list_available_keymaps,
            commands::keymap_commands::list_launch_bindings,
            commands::keymap_commands::load_keymap_by_name,
            commands::keymap_commands::get_active_application,
            commands::keymap_commands::reset_to_default,
            commands::keymap_commands::open_active_keymap_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
