mod apps;
mod commands;
mod config;
mod engine;
mod executor;
pub mod firmware;
pub mod hid;

use std::sync::{Arc, Mutex};

use apps::AppCatalog;
use config::keymap::Keymap;
use config::profiles::{ProfileStore, DEFAULT_PROFILE};
use config::storage::legacy_keymaps_dir;
use engine::KeymapEngine;
use hid::connection::HidConnection;
use tauri::{App, Manager};

/// Profiles, the keymap engine, and the app catalog, ready before any window
/// asks for them.
fn init_state(app: &mut App) -> Result<Arc<KeymapEngine>, Box<dyn std::error::Error>> {
    let paths = app.path();
    let store = ProfileStore::new(paths.app_config_dir()?);
    if let Some(legacy) = legacy_keymaps_dir() {
        if let Err(e) = store.migrate_legacy(&legacy) {
            eprintln!("{e}");
        }
    }

    // A profile that no longer loads falls back to Default, so the pad works
    let active = store.active();
    let (profile, keymap) = match store.get(&active) {
        Ok(keymap) => (active, keymap),
        Err(e) => {
            eprintln!("{e}. Using the Default profile.");
            let _ = store.set_active(DEFAULT_PROFILE);
            (DEFAULT_PROFILE.to_owned(), Keymap::bundled_default())
        }
    };

    let engine = Arc::new(KeymapEngine::new(
        profile,
        keymap,
        executor::runtime::create_runtime(),
        Arc::new(app.handle().clone()),
    ));
    engine::watch_front_app(&engine);

    app.manage(AppCatalog::new(paths.app_cache_dir()?));
    app.manage(store);
    app.manage(engine.clone());
    Ok(engine)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(HidConnection::new()))
        .setup(|app| {
            let engine = init_state(app)?;
            // Connect at launch; the poll thread also reconnects after a replug
            app.state::<Mutex<HidConnection>>()
                .lock()
                .unwrap()
                .start(app.handle().clone(), engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::apps::describe_app,
            commands::apps::list_installed_apps,
            commands::device::get_device_status,
            commands::device::set_test_mode,
            commands::engine::get_engine_snapshot,
            commands::engine::get_permissions,
            commands::engine::open_accessibility_settings,
            commands::engine::run_action,
            commands::firmware::get_firmware_status,
            commands::firmware::update_firmware,
            commands::overlay::open_overlay_window,
            commands::profiles::create_profile,
            commands::profiles::delete_profile,
            commands::profiles::export_profile,
            commands::profiles::get_profile,
            commands::profiles::import_profile,
            commands::profiles::list_profiles,
            commands::profiles::rename_profile,
            commands::profiles::reveal_profiles_dir,
            commands::profiles::save_profile,
            commands::profiles::set_active_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
