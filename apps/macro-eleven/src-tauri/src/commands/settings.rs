use serde_json::{Map, Value};
use tauri::{AppHandle, State};

use crate::config::settings::{Settings, SettingsStore};
use crate::shell::{self, shortcut, LoginItemStatus};

#[tauri::command]
pub fn get_settings(store: State<'_, SettingsStore>) -> Settings {
    store.get()
}

/// Change some settings. They apply at once and every window hears
/// `macro11:settings-changed`.
#[tauri::command]
pub fn update_settings(app: AppHandle, patch: Map<String, Value>) -> Result<Settings, String> {
    shell::update_settings(&app, &patch)
}

/// Whether macOS opens the app at login. System Settings can change it
/// too, so windows read it each time they show it.
#[tauri::command(async)]
pub fn get_login_item() -> LoginItemStatus {
    shell::login_item_status()
}

#[tauri::command(async)]
pub fn set_login_item(enabled: bool) -> Result<LoginItemStatus, String> {
    shell::set_login_item(enabled)
}

/// System Settings › General › Login Items, to allow a login item.
#[tauri::command]
pub fn open_login_items_settings() {
    shell::open_login_items_settings();
}

/// Settings is recording a new overlay shortcut: keep the saved one quiet.
#[tauri::command]
pub fn pause_overlay_shortcut(app: AppHandle, paused: bool, store: State<'_, SettingsStore>) {
    shortcut::pause(&app, &store.get().overlay_shortcut, paused);
}
