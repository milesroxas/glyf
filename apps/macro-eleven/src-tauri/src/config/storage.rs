use super::keymap::Keymap;
use std::fs;
use std::path::{Path, PathBuf};

/// Get the keymaps directory path (~/.config/macro-eleven/keymaps/)
pub fn get_keymaps_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home.join(".config").join("macro-eleven").join("keymaps");

    // Create directory if it doesn't exist
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create keymaps directory: {}", e))?;
    }

    Ok(config_dir)
}

/// Load a keymap from a JSON file
pub fn load_keymap<P: AsRef<Path>>(path: P) -> Result<Keymap, String> {
    let json =
        fs::read_to_string(path).map_err(|e| format!("Failed to read keymap file: {}", e))?;

    let keymap: Keymap =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse keymap JSON: {}", e))?;

    Ok(keymap)
}

/// Save a keymap to a JSON file
pub fn save_keymap<P: AsRef<Path>>(path: P, keymap: &Keymap) -> Result<(), String> {
    let json = serde_json::to_string_pretty(keymap)
        .map_err(|e| format!("Failed to serialize keymap: {}", e))?;

    fs::write(path, json).map_err(|e| format!("Failed to write keymap file: {}", e))?;

    Ok(())
}

/// Get the active keymap file path
/// Priority: user-custom.json > default.json
pub fn get_active_keymap_path() -> Result<PathBuf, String> {
    let dir = get_keymaps_dir()?;

    let custom_path = dir.join("user-custom.json");
    if custom_path.exists() {
        return Ok(custom_path);
    }

    let default_path = dir.join("default.json");
    Ok(default_path)
}

/// Initialize default keymap if it doesn't exist
pub fn ensure_default_keymap() -> Result<(), String> {
    let dir = get_keymaps_dir()?;
    let default_path = dir.join("default.json");

    if !default_path.exists() {
        // Write default keymap JSON
        // This is embedded as a const string to avoid needing the TypeScript package at runtime
        let default_json = include_str!("default_keymap.json");
        fs::write(&default_path, default_json)
            .map_err(|e| format!("Failed to write default keymap: {}", e))?;
    }

    Ok(())
}

/// List all available keymaps in the keymaps directory
pub fn list_keymaps() -> Result<Vec<String>, String> {
    let dir = get_keymaps_dir()?;

    let entries =
        fs::read_dir(dir).map_err(|e| format!("Failed to read keymaps directory: {}", e))?;

    let mut keymaps = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                keymaps.push(name.to_string());
            }
        }
    }

    keymaps.sort();
    Ok(keymaps)
}
