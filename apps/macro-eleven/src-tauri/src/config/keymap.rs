//! Keymap file format. Mirrors `shared/libs/keymap-schema/src/types.ts`.
//!
//! Every struct keeps fields it does not know in `extra`, so a keymap written
//! by a newer app (or by hand) survives a load and save unchanged.

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

use super::device::DeviceLayout;
use super::tokens;
use crate::executor::runtime::ShortcutSequence;

pub type Extra = Map<String, Value>;

const DEFAULT_KEYMAP_JSON: &str =
    include_str!("../../../../../shared/libs/keymap-schema/src/macro-eleven.default.json");

/// Longest single wait a macro may hold the action queue.
const MAX_WAIT_MS: u64 = 10_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Keymap {
    pub version: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device: Option<Value>,
    #[serde(deserialize_with = "layer_map")]
    pub layers: BTreeMap<u8, Layer>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settings: Option<KeymapSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    #[serde(flatten)]
    pub extra: Extra,
}

/// Layer IDs are JSON object keys. `flatten` buffers the keymap, which turns
/// numeric keys into strings that serde will not parse as `u8`, so parse here.
fn layer_map<'de, D: Deserializer<'de>>(deserializer: D) -> Result<BTreeMap<u8, Layer>, D::Error> {
    BTreeMap::<String, Layer>::deserialize(deserializer)?
        .into_iter()
        .map(|(id, layer)| {
            // Canonical decimal only, so "1" and "01" cannot both name layer 1
            id.parse::<u8>()
                .ok()
                .filter(|parsed| parsed.to_string() == id)
                .map(|parsed| (parsed, layer))
                .ok_or_else(|| {
                    serde::de::Error::custom(format!(
                        "layer ID \"{id}\" must be a whole number from 0 to 255"
                    ))
                })
        })
        .collect()
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Layer {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trigger_app: Option<String>,
    pub keys: BTreeMap<String, Action>,
    #[serde(flatten)]
    pub extra: Extra,
}

/// Fields every action has.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ActionCommon {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(flatten)]
    pub extra: Extra,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum Action {
    CycleLayer {
        #[serde(flatten)]
        common: ActionCommon,
    },
    SwitchLayer {
        layer: u8,
        #[serde(flatten)]
        common: ActionCommon,
    },
    LaunchApp {
        app: String,
        #[serde(rename = "bundleId", default, skip_serializing_if = "Option::is_none")]
        bundle_id: Option<String>,
        #[serde(rename = "focusIfRunning", default, skip_serializing_if = "Option::is_none")]
        focus_if_running: Option<bool>,
        #[serde(flatten)]
        common: ActionCommon,
    },
    Shortcut {
        keys: Vec<String>,
        #[serde(flatten)]
        common: ActionCommon,
    },
    Macro {
        sequence: Vec<MacroStep>,
        #[serde(flatten)]
        common: ActionCommon,
    },
    Plugin {
        #[serde(rename = "pluginId")]
        plugin_id: String,
        #[serde(rename = "actionId")]
        action_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        params: Option<Value>,
        #[serde(flatten)]
        common: ActionCommon,
    },
    Noop {
        #[serde(flatten)]
        common: ActionCommon,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum MacroStep {
    KeyDown { key: String },
    KeyUp { key: String },
    KeyPress { key: String },
    Shortcut { keys: Vec<String> },
    Text { text: String },
    Wait { ms: u64 },
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeymapSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_layer: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_switch_layers: Option<bool>,
    #[serde(flatten)]
    pub extra: Extra,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub struct MatrixPosition {
    pub row: u8,
    pub col: u8,
}

impl MatrixPosition {
    pub fn new(row: u8, col: u8) -> Self {
        Self { row, col }
    }

    /// "row,col", the key format in `Layer.keys`.
    pub fn to_key(self) -> String {
        format!("{},{}", self.row, self.col)
    }

    pub fn from_key(s: &str) -> Option<Self> {
        let (row, col) = s.split_once(',')?;
        Some(Self::new(row.parse().ok()?, col.parse().ok()?))
    }
}

impl Action {
    /// Why the action cannot run, given the layers that exist.
    fn problem(&self, keymap: &Keymap) -> Option<String> {
        match self {
            Action::SwitchLayer { layer, .. } if !keymap.layers.contains_key(layer) => {
                Some(format!("switches to layer {layer}, which does not exist"))
            }
            Action::LaunchApp { app, bundle_id, .. } => {
                if app.trim().is_empty() {
                    Some("needs an app name".into())
                } else if bundle_id.as_ref().is_some_and(|id| id.trim().is_empty()) {
                    Some("has an empty bundle ID".into())
                } else {
                    None
                }
            }
            Action::Shortcut { keys, .. } => {
                shortcut_problem(keys).map(|p| format!("has an invalid shortcut: {p}"))
            }
            Action::Macro { sequence, .. } => sequence
                .iter()
                .enumerate()
                .find_map(|(i, step)| step.problem().map(|p| format!("step {} {p}", i + 1))),
            Action::Plugin {
                plugin_id,
                action_id,
                ..
            } if plugin_id.trim().is_empty() || action_id.trim().is_empty() => {
                Some("needs a plugin and action ID".into())
            }
            _ => None,
        }
    }
}

impl MacroStep {
    fn problem(&self) -> Option<String> {
        match self {
            MacroStep::KeyDown { key } | MacroStep::KeyUp { key } | MacroStep::KeyPress { key } => {
                (!tokens::is_known(key)).then(|| format!("has an unknown key \"{key}\""))
            }
            MacroStep::Shortcut { keys } => {
                shortcut_problem(keys).map(|p| format!("has an invalid shortcut: {p}"))
            }
            MacroStep::Wait { ms } if *ms > MAX_WAIT_MS => {
                Some(format!("must wait 0-{MAX_WAIT_MS} ms"))
            }
            _ => None,
        }
    }
}

/// A shortcut is valid when every token is in the shared table and the host
/// can group the tokens into chords.
fn shortcut_problem(keys: &[String]) -> Option<String> {
    if let Some(unknown) = keys.iter().find(|key| !tokens::is_known(key)) {
        return Some(format!("unknown key \"{unknown}\""));
    }
    ShortcutSequence::from_keys(keys).err()
}

impl Keymap {
    /// The keymap bundled with the app (the read-only "Default" profile).
    pub fn bundled_default() -> Self {
        serde_json::from_str(DEFAULT_KEYMAP_JSON).expect("bundled default keymap is valid")
    }

    /// A keymap with one empty layer, for a new profile.
    pub fn empty() -> Self {
        let mut layers = BTreeMap::new();
        layers.insert(
            0,
            Layer {
                name: "Base".into(),
                trigger_app: None,
                keys: BTreeMap::new(),
                extra: Extra::new(),
            },
        );
        Self {
            version: Self::bundled_default().version,
            name: String::new(),
            description: None,
            device: None,
            layers,
            settings: None,
            metadata: None,
            extra: Extra::new(),
        }
    }

    /// Parse and validate keymap JSON.
    pub fn parse(json: &str, device: &DeviceLayout) -> Result<Self, String> {
        let keymap: Keymap =
            serde_json::from_str(json).map_err(|e| format!("Not a valid keymap: {e}"))?;
        keymap.validate(device)?;
        Ok(keymap)
    }

    /// The checks `assertKeymap` runs in TypeScript, over the same fixtures.
    pub fn validate(&self, device: &DeviceLayout) -> Result<(), String> {
        if self.version.trim().is_empty() {
            return Err("Keymap needs a version".into());
        }
        if self.name.trim().is_empty() {
            return Err("Keymap needs a name".into());
        }
        if !self.layers.contains_key(&0) {
            return Err("Keymap needs layer 0".into());
        }
        for (id, layer) in &self.layers {
            if layer.trigger_app.as_ref().is_some_and(|app| app.trim().is_empty()) {
                return Err(format!("Layer {id} has an empty trigger app"));
            }
            for (pos, action) in &layer.keys {
                if !MatrixPosition::from_key(pos).is_some_and(|p| device.in_matrix(p)) {
                    return Err(format!(
                        "Layer {id} has a key at {pos}, outside {}'s {} matrix",
                        device.name,
                        device.matrix_size()
                    ));
                }
                if let Some(problem) = action.problem(self) {
                    return Err(format!("Key {pos} on layer {id} {problem}"));
                }
            }
        }
        if let Some(layer) = self.settings.as_ref().and_then(|s| s.default_layer) {
            if !self.layers.contains_key(&layer) {
                return Err(format!("Default layer {layer} does not exist"));
            }
        }
        Ok(())
    }

    pub fn get_action(&self, layer: u8, pos: MatrixPosition) -> Option<&Action> {
        self.layers.get(&layer)?.keys.get(&pos.to_key())
    }

    fn auto_switch(&self) -> bool {
        self.settings
            .as_ref()
            .and_then(|s| s.auto_switch_layers)
            .unwrap_or(true)
    }

    /// The layer after `current` in ID order, wrapping to the first.
    pub fn next_layer(&self, current: u8) -> u8 {
        self.layers
            .range(current.saturating_add(1)..)
            .next()
            .filter(|_| current < u8::MAX)
            .or_else(|| self.layers.iter().next())
            .map_or(0, |(id, _)| *id)
    }

    /// Layer for the front app: the lowest layer whose trigger matches the
    /// app's name or bundle ID, else the default layer, else `current`.
    pub fn layer_for_app(&self, front: Option<&FrontApp>, current: u8) -> u8 {
        if !self.auto_switch() {
            return current;
        }
        let triggered = front.and_then(|app| {
            self.layers.iter().find_map(|(id, layer)| {
                layer
                    .trigger_app
                    .as_deref()
                    .filter(|trigger| app.matches(trigger))
                    .map(|_| *id)
            })
        });
        triggered
            .or_else(|| self.settings.as_ref().and_then(|s| s.default_layer))
            .filter(|id| self.layers.contains_key(id))
            .unwrap_or(current)
    }
}

/// The frontmost app, as the layer triggers see it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FrontApp {
    pub name: String,
    pub bundle_id: Option<String>,
}

impl FrontApp {
    pub fn matches(&self, trigger: &str) -> bool {
        self.bundle_id.as_deref() == Some(trigger) || self.name == trigger
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::device::macro_eleven;
    use std::fs;
    use std::path::PathBuf;

    fn fixtures(kind: &str) -> Vec<(String, String)> {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../shared/libs/keymap-schema/fixtures")
            .join(kind);
        let mut files: Vec<_> = fs::read_dir(&dir)
            .unwrap_or_else(|e| panic!("read {}: {e}", dir.display()))
            .map(|entry| entry.unwrap().path())
            .filter(|path| path.extension().is_some_and(|ext| ext == "json"))
            .map(|path| {
                let name = path.file_name().unwrap().to_string_lossy().into_owned();
                (name, fs::read_to_string(&path).unwrap())
            })
            .collect();
        files.sort();
        assert!(!files.is_empty(), "no fixtures in {}", dir.display());
        files
    }

    fn keymap(json: Value) -> Keymap {
        serde_json::from_value(json).unwrap()
    }

    #[test]
    fn bundled_default_is_valid() {
        Keymap::bundled_default().validate(macro_eleven()).unwrap();
    }

    #[test]
    fn accepts_the_shared_valid_fixtures() {
        for (name, json) in fixtures("valid") {
            if let Err(e) = Keymap::parse(&json, macro_eleven()) {
                panic!("{name} should be valid: {e}");
            }
        }
    }

    #[test]
    fn rejects_the_shared_invalid_fixtures() {
        for (name, json) in fixtures("invalid") {
            assert!(
                Keymap::parse(&json, macro_eleven()).is_err(),
                "{name} should be rejected"
            );
        }
    }

    #[test]
    fn round_trips_unknown_fields() {
        for (name, json) in fixtures("valid") {
            let original: Value = serde_json::from_str(&json).unwrap();
            let keymap: Keymap = serde_json::from_str(&json).unwrap();
            assert_eq!(
                serde_json::to_value(&keymap).unwrap(),
                original,
                "{name} changed on round-trip"
            );
        }
    }

    #[test]
    fn saves_layers_in_id_order() {
        let keymap = keymap(serde_json::json!({
            "version": "1", "name": "x",
            "layers": { "10": { "name": "b", "keys": {} }, "2": { "name": "a", "keys": {} }, "0": { "name": "z", "keys": {} } }
        }));
        let json = serde_json::to_string(&keymap).unwrap();
        let order: Vec<_> = ["\"0\"", "\"2\"", "\"10\""]
            .iter()
            .map(|id| json.find(id).unwrap())
            .collect();
        assert!(order.windows(2).all(|w| w[0] < w[1]), "{json}");
    }

    #[test]
    fn matrix_position_keys() {
        assert_eq!(MatrixPosition::from_key("1,2"), Some(MatrixPosition::new(1, 2)));
        assert_eq!(MatrixPosition::new(2, 3).to_key(), "2,3");
        assert_eq!(MatrixPosition::from_key("1"), None);
        assert_eq!(MatrixPosition::from_key("a,b"), None);
        assert_eq!(MatrixPosition::from_key("1,2,3"), None);
    }

    fn sparse() -> Keymap {
        keymap(serde_json::json!({
            "version": "1", "name": "x",
            "layers": {
                "0": { "name": "base", "keys": {} },
                "1": { "name": "notes", "triggerApp": "com.apple.Notes", "keys": {} },
                "5": { "name": "figma", "triggerApp": "Figma", "keys": {} },
                "7": { "name": "notes again", "triggerApp": "com.apple.Notes", "keys": {} }
            },
            "settings": { "defaultLayer": 0 }
        }))
    }

    #[test]
    fn cycles_through_sparse_layer_ids() {
        let keymap = sparse();
        assert_eq!(keymap.next_layer(0), 1);
        assert_eq!(keymap.next_layer(1), 5);
        assert_eq!(keymap.next_layer(7), 0);
        assert_eq!(keymap.next_layer(255), 0);
    }

    #[test]
    fn matches_triggers_by_bundle_id_or_name_lowest_first() {
        let keymap = sparse();
        let notes = FrontApp {
            name: "Notes".into(),
            bundle_id: Some("com.apple.Notes".into()),
        };
        let figma = FrontApp {
            name: "Figma".into(),
            bundle_id: Some("com.figma.Desktop".into()),
        };
        let other = FrontApp {
            name: "Mail".into(),
            bundle_id: None,
        };
        assert_eq!(keymap.layer_for_app(Some(&notes), 5), 1);
        assert_eq!(keymap.layer_for_app(Some(&figma), 0), 5);
        assert_eq!(keymap.layer_for_app(Some(&other), 5), 0);
    }

    #[test]
    fn keeps_the_current_layer_when_not_following_apps() {
        let mut keymap = sparse();
        keymap.settings = Some(KeymapSettings {
            auto_switch_layers: Some(false),
            ..Default::default()
        });
        let notes = FrontApp {
            name: "Notes".into(),
            bundle_id: Some("com.apple.Notes".into()),
        };
        assert_eq!(keymap.layer_for_app(Some(&notes), 5), 5);
    }
}
