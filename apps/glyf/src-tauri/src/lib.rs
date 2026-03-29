mod commands;
mod config;
mod hid;

use std::io::Write;
use std::sync::Mutex;

use config::{display_config::GlyfConfig, storage::load_config};
use hid::connection::HidConnection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // RUST_LOG=glyf_lib::hid=debug,glyf_lib::commands::device=debug — compact format so messages are not truncated in narrow terminals
    let _ = env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("warn"),
    )
    .format(|buf, record| {
        writeln!(buf, "[glyf] {} {}", record.level(), record.args())
    })
    .try_init();

    let initial_config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(HidConnection::new()))
        .manage(Mutex::new(initial_config as GlyfConfig))
        .invoke_handler(tauri::generate_handler![
            commands::device::detect_device_cmd,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::get_device_connection_snapshot,
            commands::device::set_display_brightness,
            commands::device::set_display_power,
            commands::device::fill_display,
            commands::display::get_display_config,
            commands::display::save_display_config,
            commands::display::reset_display_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
