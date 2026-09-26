mod apps;
mod commands;
mod config;
mod engine;
mod executor;
pub mod firmware;
pub mod hid;
mod shell;

use std::sync::{Arc, Mutex};

use apps::AppCatalog;
use config::keymap::Keymap;
use config::profiles::{ProfileStore, DEFAULT_PROFILE};
use config::settings::SettingsStore;
use config::storage::legacy_keymaps_dir;
use engine::KeymapEngine;
use hid::connection::HidConnection;
use shell::{overlay, panel, tray, windows};
use tauri::{App, AppHandle, Manager, RunEvent, Window, WindowEvent};

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
        executor::volume::create_volume(),
        Arc::new(app.handle().clone()),
    ));
    engine::watch_front_app(&engine);

    app.manage(AppCatalog::new(paths.app_cache_dir()?));
    app.manage(store);
    app.manage(engine.clone());
    Ok(engine)
}

/// The menu bar icon, its panel, the overlay, and the designer, arranged
/// the way the saved settings say. A login launch stays in the menu bar.
fn init_shell(app: &AppHandle, launched_at_login: bool) -> tauri::Result<()> {
    app.manage(SettingsStore::load(app.path().app_config_dir()?));
    let settings = app.state::<SettingsStore>().get();
    tray::create(app)?;
    panel::create(app)?;
    shell::shortcut::register_saved(app, &settings.overlay_shortcut);
    shell::apply_settings(app, None, &settings);
    if !launched_at_login {
        windows::show_main(app, None);
    }
    Ok(())
}

/// Closing never quits: the designer and Settings hide, the overlay turns
/// off. The panel closes when it loses the keyboard.
fn on_window_event(window: &Window, event: &WindowEvent) {
    let app = window.app_handle();
    let label = window.label();
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            match label {
                overlay::LABEL => {
                    if let Err(e) = overlay::set_visible(app, false) {
                        eprintln!("{e}");
                    }
                }
                panel::LABEL => panel::hide(app),
                _ => {
                    if let Some(window) = app.get_webview_window(label) {
                        windows::hide(app, &window);
                    }
                }
            }
        }
        WindowEvent::Focused(false) if label == panel::LABEL => panel::hide(app),
        WindowEvent::Moved(_) | WindowEvent::Resized(_) if label == overlay::LABEL => {
            if let Some(window) = app.get_webview_window(label) {
                overlay::track_frame(&window);
            }
        }
        _ => {}
    }
}

fn on_run_event(app: &AppHandle, event: RunEvent) {
    match event {
        // The Dock icon, or opening the app again from Finder or Spotlight
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => windows::show_main(app, None),
        RunEvent::Exit => overlay::save_frame(app),
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(shell::shortcut::plugin())
        .manage(Mutex::new(HidConnection::new()))
        .manage(windows::OpenWindows::default())
        .manage(panel::PanelState::default())
        .manage(overlay::OverlayFrame::default())
        .manage(tray::TrayStatus::default())
        .menu(shell::menu::app_menu)
        .on_menu_event(shell::menu::handle)
        .on_window_event(on_window_event)
        .setup(|app| {
            // Read first, while the open-application event is current
            let launched_at_login = shell::launched_at_login();
            let engine = init_state(app)?;
            // Connect at launch; the poll thread also reconnects after a replug
            app.state::<Mutex<HidConnection>>()
                .lock()
                .unwrap()
                .start(app.handle().clone(), engine);
            init_shell(app.handle(), launched_at_login)?;
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
            commands::overlay::get_backdrop,
            commands::overlay::refresh_overlay_backdrop,
            commands::overlay::set_overlay_dimmed,
            commands::overlay::reset_overlay_frame,
            commands::overlay::set_overlay_visible,
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
            commands::settings::get_login_item,
            commands::settings::get_settings,
            commands::settings::open_login_items_settings,
            commands::settings::pause_overlay_shortcut,
            commands::settings::set_login_item,
            commands::settings::update_settings,
            commands::shell::fit_panel,
            commands::shell::fit_settings_window,
            commands::shell::hide_panel,
            commands::shell::quit_app,
            commands::shell::show_main_window,
            commands::shell::show_settings_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the app")
        .run(on_run_event);
}
