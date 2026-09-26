//! The user's app preferences and the window state the app remembers:
//!
//! ```text
//! <app_config_dir>/
//!   preferences.json    Settings: what the Settings window shows
//!   window-state.json   where the overlay was, and one-time tips already shown
//! ```
//!
//! Open at Login is not stored here: System Settings owns it, so the app
//! reads it from macOS every time (`shell::login_item`).

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use super::storage::write_json_atomic;

const PREFERENCES_FILE: &str = "preferences.json";
const WINDOW_STATE_FILE: &str = "window-state.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OverlayMaterial {
    /// Liquid Glass (vibrancy before macOS 26) behind the keys.
    Glass,
    /// The pad's chassis color.
    Solid,
}

/// Mirrors `Settings` in `src/entities/settings.ts`. Fields missing from the
/// file take their defaults, so older files keep loading.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// The menu bar icon.
    pub menu_bar_icon: bool,
    /// The live layer's name beside the menu bar icon.
    pub menu_bar_layer: bool,
    /// A Dock icon while the designer or Settings is open.
    pub dock_icon: bool,
    pub overlay_visible: bool,
    pub overlay_on_top: bool,
    pub overlay_all_spaces: bool,
    pub overlay_material: OverlayMaterial,
    /// How much of the desktop shows through the glass: 0 to 1.
    pub overlay_transparency: f64,
    /// Fade after a few seconds without input.
    pub overlay_fade_when_idle: bool,
    /// Shows or hides the overlay from any app. Shortcut tokens; empty for none.
    pub overlay_shortcut: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            menu_bar_icon: true,
            menu_bar_layer: false,
            dock_icon: true,
            overlay_visible: false,
            overlay_on_top: true,
            overlay_all_spaces: true,
            overlay_material: OverlayMaterial::Glass,
            overlay_transparency: 0.6,
            overlay_fade_when_idle: true,
            overlay_shortcut: Vec::new(),
        }
    }
}

impl Settings {
    /// Keep values in range, whatever the file or the UI sent.
    fn normalized(mut self) -> Self {
        self.overlay_transparency = if self.overlay_transparency.is_finite() {
            self.overlay_transparency.clamp(0.0, 1.0)
        } else {
            Settings::default().overlay_transparency
        };
        self
    }

    /// `patch` merged over these settings. Unknown fields are ignored; a field
    /// with the wrong type is an error, so a bad patch changes nothing.
    pub fn merged(&self, patch: &Map<String, Value>) -> Result<Settings, String> {
        let mut value = serde_json::to_value(self).map_err(|e| e.to_string())?;
        let fields = value.as_object_mut().expect("settings serialize to an object");
        for (key, next) in patch {
            if let Some(field) = fields.get_mut(key) {
                *field = next.clone();
            }
        }
        serde_json::from_value::<Settings>(value)
            .map(Settings::normalized)
            .map_err(|e| format!("Could not apply that setting: {e}"))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Frame {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// What the app remembers between launches that is not a preference.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WindowState {
    /// The overlay's outer frame in logical points, top-left origin.
    pub overlay_frame: Option<Frame>,
    /// The menu bar tip that appears when the main window first closes.
    pub close_tip_shown: bool,
}

fn read_json<T: for<'de> Deserialize<'de> + Default>(path: &Path) -> T {
    match fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
            eprintln!("{} is not valid ({e}). Using defaults.", path.display());
            T::default()
        }),
        Err(_) => T::default(),
    }
}

/// Preferences and window state, loaded once and written on every change.
pub struct SettingsStore {
    root: PathBuf,
    settings: Mutex<Settings>,
    window: Mutex<WindowState>,
}

impl SettingsStore {
    pub fn load(root: PathBuf) -> Self {
        let settings = read_json::<Settings>(&root.join(PREFERENCES_FILE)).normalized();
        let window = read_json::<WindowState>(&root.join(WINDOW_STATE_FILE));
        Self {
            root,
            settings: Mutex::new(settings),
            window: Mutex::new(window),
        }
    }

    pub fn get(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    /// Apply `patch` and save. Returns the settings before and after.
    pub fn update(&self, patch: &Map<String, Value>) -> Result<(Settings, Settings), String> {
        let mut settings = self.settings.lock().unwrap();
        let next = settings.merged(patch)?;
        if next != *settings {
            write_json_atomic(&self.root.join(PREFERENCES_FILE), &next)?;
        }
        let before = std::mem::replace(&mut *settings, next.clone());
        Ok((before, next))
    }

    pub fn window_state(&self) -> WindowState {
        self.window.lock().unwrap().clone()
    }

    pub fn update_window_state(&self, change: impl FnOnce(&mut WindowState)) {
        let mut state = self.window.lock().unwrap();
        let before = state.clone();
        change(&mut state);
        if *state != before {
            if let Err(e) = write_json_atomic(&self.root.join(WINDOW_STATE_FILE), &*state) {
                eprintln!("{e}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn patch(value: Value) -> Map<String, Value> {
        value.as_object().unwrap().clone()
    }

    #[test]
    fn a_missing_file_gives_the_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::load(dir.path().to_path_buf());
        assert_eq!(store.get(), Settings::default());
        assert_eq!(store.window_state(), WindowState::default());
    }

    #[test]
    fn an_older_file_keeps_its_values_and_gains_new_defaults() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join(PREFERENCES_FILE),
            r#"{ "dockIcon": false, "retiredField": 1 }"#,
        )
        .unwrap();
        let settings = SettingsStore::load(dir.path().to_path_buf()).get();
        assert!(!settings.dock_icon);
        assert!(settings.menu_bar_icon);
    }

    #[test]
    fn a_broken_file_falls_back_to_the_defaults() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join(PREFERENCES_FILE), "{ not json").unwrap();
        assert_eq!(SettingsStore::load(dir.path().to_path_buf()).get(), Settings::default());
    }

    #[test]
    fn updates_merge_save_and_survive_a_reload() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::load(dir.path().to_path_buf());
        let (before, after) = store
            .update(&patch(json!({ "overlayMaterial": "solid", "menuBarLayer": true })))
            .unwrap();
        assert_eq!(before, Settings::default());
        assert_eq!(after.overlay_material, OverlayMaterial::Solid);
        assert!(after.menu_bar_layer);
        assert!(after.overlay_on_top, "fields not in the patch keep their values");

        let reloaded = SettingsStore::load(dir.path().to_path_buf()).get();
        assert_eq!(reloaded, after);
    }

    #[test]
    fn a_patch_with_a_wrong_type_changes_nothing() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::load(dir.path().to_path_buf());
        assert!(store.update(&patch(json!({ "dockIcon": "yes" }))).is_err());
        assert!(store.update(&patch(json!({ "overlayMaterial": "chrome" }))).is_err());
        assert_eq!(store.get(), Settings::default());
        assert!(!dir.path().join(PREFERENCES_FILE).exists());
    }

    #[test]
    fn transparency_stays_between_zero_and_one() {
        let settings = Settings::default();
        let high = settings.merged(&patch(json!({ "overlayTransparency": 3.5 }))).unwrap();
        let low = settings.merged(&patch(json!({ "overlayTransparency": -1 }))).unwrap();
        assert_eq!(high.overlay_transparency, 1.0);
        assert_eq!(low.overlay_transparency, 0.0);
    }

    #[test]
    fn window_state_saves_only_when_it_changes() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::load(dir.path().to_path_buf());
        store.update_window_state(|_| {});
        assert!(!dir.path().join(WINDOW_STATE_FILE).exists());

        let frame = Frame { x: 10.0, y: 20.0, width: 336.0, height: 274.0 };
        store.update_window_state(|state| {
            state.overlay_frame = Some(frame);
            state.close_tip_shown = true;
        });
        let reloaded = SettingsStore::load(dir.path().to_path_buf()).window_state();
        assert_eq!(reloaded.overlay_frame, Some(frame));
        assert!(reloaded.close_tip_shown);
    }
}
