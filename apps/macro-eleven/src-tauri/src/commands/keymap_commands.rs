use crate::config::keymap::{Action, Keymap, MatrixPosition};
use crate::config::storage::{
    ensure_default_keymap, get_active_keymap_path, get_keymaps_dir, list_keymaps, load_keymap,
    save_keymap,
};
use crate::executor::app_detector::get_active_app;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, serde::Serialize)]
pub struct LaunchBinding {
    pub app: String,
    pub label: Option<String>,
    pub layer: u8,
    pub layer_name: String,
    pub row: u8,
    pub col: u8,
}

/// Get the currently active keymap
#[tauri::command]
pub fn get_active_keymap() -> Result<Keymap, String> {
    // Ensure default keymap exists
    ensure_default_keymap()?;

    // Load the active keymap
    let path = get_active_keymap_path()?;
    load_keymap(path)
}

/// Save the current keymap to user-custom.json
#[tauri::command]
pub fn save_user_keymap(keymap: Keymap) -> Result<(), String> {
    let dir = get_keymaps_dir()?;
    let path = dir.join("user-custom.json");

    save_keymap(path, &keymap)
}

/// List all available keymaps
#[tauri::command]
pub fn list_available_keymaps() -> Result<Vec<String>, String> {
    list_keymaps()
}

/// Return all launchable applications defined in the active keymap.
#[tauri::command]
pub fn list_launch_bindings() -> Result<Vec<LaunchBinding>, String> {
    ensure_default_keymap()?;
    let path = get_active_keymap_path()?;
    let keymap = load_keymap(path)?;
    Ok(extract_launch_bindings(&keymap))
}

/// Load a specific keymap by name
#[tauri::command]
pub fn load_keymap_by_name(name: String) -> Result<Keymap, String> {
    let dir = get_keymaps_dir()?;
    let path = dir.join(format!("{}.json", name));

    load_keymap(path)
}

/// Get the currently active application name
#[tauri::command]
pub fn get_active_application() -> Option<String> {
    get_active_app()
}

/// Reset to default keymap (deletes user-custom.json)
#[tauri::command]
pub fn reset_to_default() -> Result<(), String> {
    let dir = get_keymaps_dir()?;
    let custom_path = dir.join("user-custom.json");

    if custom_path.exists() {
        std::fs::remove_file(custom_path)
            .map_err(|e| format!("Failed to delete user keymap: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_active_keymap_file() -> Result<(), String> {
    ensure_default_keymap()?;
    let dir = get_keymaps_dir()?;
    let custom_path = dir.join("user-custom.json");

    if !custom_path.exists() {
        let active_path = get_active_keymap_path()?;
        fs::copy(&active_path, &custom_path)
            .map_err(|e| format!("Failed to create user keymap file: {}", e))?;
    }

    open_in_default_editor(&custom_path)
}

fn open_in_default_editor(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Err(err) = open_with_cursor(path) {
            eprintln!(
                "Failed to open in Cursor: {}. Falling back to default handler.",
                err
            );
            open_with_command("open", path)
        } else {
            Ok(())
        }
    }

    #[cfg(target_os = "linux")]
    {
        open_with_command("xdg-open", path)
    }

    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .arg("/C")
            .arg("start")
            .arg("")
            .arg(path)
            .status()
            .map_err(|e| format!("Failed to open keymap file: {}", e))?;

        if status.success() {
            Ok(())
        } else {
            Err("Failed to open keymap file".to_string())
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        let _ = path;
        Err("Opening keymap file is not supported on this platform".to_string())
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn open_with_command(command: &str, path: &Path) -> Result<(), String> {
    let status = Command::new(command)
        .arg(path)
        .status()
        .map_err(|e| format!("Failed to open keymap file: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to open keymap file".to_string())
    }
}

#[cfg(target_os = "macos")]
fn open_with_cursor(path: &Path) -> Result<(), String> {
    let status = Command::new("open")
        .arg("-a")
        .arg("Cursor")
        .arg(path)
        .status()
        .map_err(|e| format!("Failed to open keymap file in Cursor: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("Cursor did not launch successfully".to_string())
    }
}

fn extract_launch_bindings(keymap: &Keymap) -> Vec<LaunchBinding> {
    let mut bindings = Vec::new();
    for (layer_id, layer) in &keymap.layers {
        for (pos_key, action) in &layer.keys {
            if let Action::LaunchApp { app, label, .. } = action {
                if let Some(position) = MatrixPosition::from_key(pos_key) {
                    bindings.push(LaunchBinding {
                        app: app.clone(),
                        label: label.clone(),
                        layer: *layer_id,
                        layer_name: layer.name.clone(),
                        row: position.row,
                        col: position.col,
                    });
                }
            }
        }
    }
    bindings.sort_by(|a, b| a.app.cmp(&b.app).then(a.layer.cmp(&b.layer)));
    bindings
}
