use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::config::keymap::Action;
use crate::engine::KeymapEngine;
use crate::executor::permissions::{accessibility_trusted, ACCESSIBILITY_SETTINGS_URL};
use crate::hid::connection::HidConnection;

/// Everything a window needs on mount; events only report changes.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub layer: u8,
    pub active_profile: String,
    pub host_control: bool,
    pub connected: bool,
}

#[derive(Serialize)]
pub struct Permissions {
    pub accessibility: bool,
}

#[tauri::command]
pub fn get_engine_snapshot(
    engine: State<'_, Arc<KeymapEngine>>,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<EngineStatus, String> {
    let snapshot = engine.snapshot();
    let connection = connection.lock().map_err(|e| e.to_string())?;
    Ok(EngineStatus {
        layer: snapshot.layer,
        active_profile: snapshot.active_profile,
        host_control: connection.host_control(),
        connected: connection.is_connected(),
    })
}

/// Run an action now (the designer's "Try"). Waits for the result, on the
/// same queue as key presses.
#[tauri::command]
pub async fn run_action(
    action: Action,
    engine: State<'_, Arc<KeymapEngine>>,
) -> Result<(), String> {
    let engine = engine.inner().clone();
    tauri::async_runtime::spawn_blocking(move || engine.run_action(action))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn get_permissions() -> Permissions {
    Permissions {
        accessibility: accessibility_trusted(),
    }
}

#[tauri::command]
pub fn open_accessibility_settings(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(ACCESSIBILITY_SETTINGS_URL, None::<&str>)
        .map_err(|e| e.to_string())
}
