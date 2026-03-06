use crate::config::keymap::{Action, Keymap, MatrixPosition};
use crate::config::storage::{ensure_default_keymap, get_active_keymap_path, load_keymap};
use crate::keymap::parser::{parse_keymap, LayerData};
use std::path::Path;

const MATRIX_POSITIONS: &[(u8, u8)] = &[
    (0, 0),
    (0, 1),
    (0, 2),
    (1, 0),
    (1, 1),
    (1, 2),
    (1, 3),
    (2, 0),
    (2, 1),
    (2, 2),
    (2, 3),
];

#[tauri::command]
pub fn get_layer_data(path: Option<String>) -> Result<Vec<LayerData>, String> {
    if let Some(path) = path {
        return load_from_source(Path::new(&path));
    }

    ensure_default_keymap()?;
    let keymap_path = get_active_keymap_path()?;
    let keymap = load_keymap(&keymap_path)?;
    Ok(convert_keymap_to_layers(&keymap))
}

fn load_from_source(path: &Path) -> Result<Vec<LayerData>, String> {
    let source =
        std::fs::read_to_string(path).map_err(|e| format!("Failed to read keymap: {}", e))?;
    Ok(parse_keymap(&source))
}

fn convert_keymap_to_layers(keymap: &Keymap) -> Vec<LayerData> {
    let mut layers: Vec<LayerData> = keymap
        .layers
        .iter()
        .map(|(index, layer)| {
            let mut keys = Vec::with_capacity(MATRIX_POSITIONS.len());
            for (row, col) in MATRIX_POSITIONS {
                let pos = MatrixPosition::new(*row, *col).to_key();
                let label = layer
                    .keys
                    .get(&pos)
                    .map(|action| action_label(action))
                    .unwrap_or_else(|| "—".to_string());
                keys.push(label);
            }

            LayerData {
                index: *index as usize,
                name: layer.name.clone(),
                keys,
            }
        })
        .collect();

    layers.sort_by_key(|layer| layer.index);
    layers
}

fn action_label(action: &Action) -> String {
    match action {
        Action::CycleLayer { label } => label.clone().unwrap_or_else(|| "Cycle Layers".to_string()),
        Action::SwitchLayer { layer, label } => {
            label.clone().unwrap_or_else(|| format!("Layer {}", layer))
        }
        Action::LaunchApp {
            app,
            focus_if_running: _,
            label,
        } => label.clone().unwrap_or_else(|| format!("Launch {}", app)),
        Action::Shortcut { keys, label } => label.clone().unwrap_or_else(|| {
            if keys.is_empty() {
                "Shortcut".to_string()
            } else {
                keys.join(" + ")
            }
        }),
        Action::Macro { label, .. } => label.clone().unwrap_or_else(|| "Macro".to_string()),
        Action::Plugin {
            plugin_id,
            action_id,
            label,
            ..
        } => label
            .clone()
            .unwrap_or_else(|| format!("{}:{}", plugin_id, action_id)),
        Action::Noop { label } => label.clone().unwrap_or_else(|| "—".to_string()),
    }
}
