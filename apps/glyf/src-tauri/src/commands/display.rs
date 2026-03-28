use std::sync::Mutex;

use tauri::State;

use crate::config::display_config::DisplayConfig;
use crate::config::storage::{load_config, save_config};

#[tauri::command]
pub fn get_display_config() -> DisplayConfig {
    load_config().display
}

#[tauri::command]
pub fn save_display_config(
    config: DisplayConfig,
    app_config: State<'_, Mutex<crate::config::display_config::GlyfConfig>>,
) -> Result<(), String> {
    let mut cfg = app_config.lock().unwrap();
    cfg.display = config;
    save_config(&cfg)
}

#[tauri::command]
pub fn reset_display_config(
    app_config: State<'_, Mutex<crate::config::display_config::GlyfConfig>>,
) -> Result<(), String> {
    let mut cfg = app_config.lock().unwrap();
    cfg.display = DisplayConfig::default();
    save_config(&cfg)
}
