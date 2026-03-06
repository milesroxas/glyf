use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Keymap schema - mirrors @embedded/keymap-schema TypeScript types
///
/// This is the Rust representation of the shared keymap schema.
/// Keep in sync with /shared/libs/keymap-schema/src/types.ts

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keymap {
    pub version: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device: Option<DeviceInfo>,
    pub layers: HashMap<u8, Layer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<KeymapSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<KeymapMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "vendorId")]
    pub vendor_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "productId")]
    pub product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matrix: Option<MatrixInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixInfo {
    pub rows: u8,
    pub cols: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "triggerApp")]
    pub trigger_app: Option<String>,
    pub keys: HashMap<String, Action>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum Action {
    #[serde(rename = "cycle_layer")]
    CycleLayer {
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "switch_layer")]
    SwitchLayer {
        layer: u8,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "launch_app")]
    LaunchApp {
        app: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[serde(rename = "focusIfRunning")]
        focus_if_running: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "shortcut")]
    Shortcut {
        keys: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "macro")]
    Macro {
        sequence: Vec<MacroStep>,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "plugin")]
    Plugin {
        #[serde(rename = "pluginId")]
        plugin_id: String,
        #[serde(rename = "actionId")]
        action_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        params: Option<HashMap<String, serde_json::Value>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    #[serde(rename = "noop")]
    Noop {
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MacroStep {
    #[serde(rename = "keydown")]
    KeyDown { key: String },
    #[serde(rename = "keyup")]
    KeyUp { key: String },
    #[serde(rename = "keypress")]
    KeyPress { key: String },
    #[serde(rename = "shortcut")]
    Shortcut { keys: Vec<String> },
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "wait")]
    Wait { ms: u64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeymapSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "defaultLayer")]
    pub default_layer: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "autoSwitchLayers")]
    pub auto_switch_layers: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "debounceMs")]
    pub debounce_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeymapMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

/// Matrix position
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct MatrixPosition {
    pub row: u8,
    pub col: u8,
}

impl MatrixPosition {
    pub fn new(row: u8, col: u8) -> Self {
        Self { row, col }
    }

    /// Format as "row,col" string for keymap lookup
    pub fn to_key(&self) -> String {
        format!("{},{}", self.row, self.col)
    }

    /// Parse from "row,col" string
    pub fn from_key(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split(',').collect();
        if parts.len() != 2 {
            return None;
        }
        let row = parts[0].parse().ok()?;
        let col = parts[1].parse().ok()?;
        Some(Self { row, col })
    }
}

/// Helper to get action for a specific key in a layer
impl Keymap {
    pub fn get_action(&self, layer: u8, pos: MatrixPosition) -> Option<&Action> {
        self.layers.get(&layer)?.keys.get(&pos.to_key())
    }

    /// Determine active layer based on active app
    pub fn determine_layer(&self, active_app: Option<&str>, current_layer: u8) -> u8 {
        // If auto-switching is disabled, use current layer
        let auto_switch = self
            .settings
            .as_ref()
            .and_then(|s| s.auto_switch_layers)
            .unwrap_or(true);

        if !auto_switch {
            return current_layer;
        }

        // Check if any layer matches the active app
        if let Some(app) = active_app {
            for (layer_num, layer) in &self.layers {
                if let Some(ref trigger_app) = layer.trigger_app {
                    if trigger_app == app {
                        return *layer_num;
                    }
                }
            }
        }

        // Fall back to default layer or current layer
        self.settings
            .as_ref()
            .and_then(|s| s.default_layer)
            .unwrap_or(current_layer)
    }
}
