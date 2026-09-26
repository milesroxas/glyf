//! Windows and the menu bar panel.

use tauri::AppHandle;

use crate::shell::{panel, windows};

/// Bring up the designer, optionally on a page (`/firmware`).
#[tauri::command]
pub fn show_main_window(app: AppHandle, route: Option<String>) {
    windows::show_main(&app, route.as_deref());
}

#[tauri::command]
pub fn show_settings_window(app: AppHandle) {
    windows::show_settings(&app);
}

/// The Settings page measured its pane (height in points).
#[tauri::command]
pub fn fit_settings_window(app: AppHandle, height: f64) {
    windows::fit_settings(&app, height);
}

/// The panel page measured itself (height in points).
#[tauri::command]
pub fn fit_panel(app: AppHandle, height: f64) {
    panel::fit(&app, height);
}

#[tauri::command]
pub fn hide_panel(app: AppHandle) {
    panel::hide(&app);
}

/// Quit for real: the pad stops running actions until the app opens again.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
