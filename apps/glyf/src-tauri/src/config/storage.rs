use std::fs;
use std::path::PathBuf;

use super::display_config::GlyfConfig;

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("glyf")
        .join("config.json")
}

pub fn load_config() -> GlyfConfig {
    let path = config_path();
    if path.exists() {
        if let Ok(contents) = fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<GlyfConfig>(&contents) {
                return cfg;
            }
        }
    }
    let default = GlyfConfig::default();
    let _ = save_config(&default);
    default
}

pub fn save_config(config: &GlyfConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}
