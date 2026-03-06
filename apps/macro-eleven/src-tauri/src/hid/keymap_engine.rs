use crate::config::keymap::{Action, Keymap, MatrixPosition};
use crate::config::storage::{ensure_default_keymap, get_active_keymap_path, load_keymap};
use crate::executor::actions::ActionExecutor;
use crate::executor::app_detector::get_active_app;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

/// Keymap engine - handles key events and executes actions
pub struct KeymapEngine {
    keymap: Arc<Mutex<Keymap>>,
    current_layer: Arc<Mutex<u8>>,
    last_key_state: Arc<Mutex<[bool; 11]>>,
    app_handle: AppHandle,
    manual_override: Arc<Mutex<Option<u8>>>,
    action_executor: Arc<ActionExecutor>,
}

impl KeymapEngine {
    pub fn new(app_handle: AppHandle) -> Result<Self, String> {
        // Ensure default keymap exists
        ensure_default_keymap()?;

        // Load active keymap
        let path = get_active_keymap_path()?;
        let keymap = load_keymap(path)?;
        let action_executor = ActionExecutor::new()?;

        Ok(Self {
            keymap: Arc::new(Mutex::new(keymap)),
            current_layer: Arc::new(Mutex::new(0)),
            last_key_state: Arc::new(Mutex::new([false; 11])),
            app_handle,
            manual_override: Arc::new(Mutex::new(None)),
            action_executor: Arc::new(action_executor),
        })
    }

    /// Process new key state from firmware
    /// Detects changes and emits individual key events
    pub fn process_key_state(&self, keys: &[bool; 11], _firmware_layer: u8, actions_enabled: bool) {
        let mut last_state = self.last_key_state.lock().unwrap();
        let mut current_layer = self.current_layer.lock().unwrap();

        // Detect key presses/releases
        for (i, &pressed) in keys.iter().enumerate() {
            if pressed != last_state[i] {
                // Key state changed
                let pos = Self::index_to_position(i);

                // Emit key press event to frontend
                let _ = self.app_handle.emit(
                    "macro11:key-press",
                    serde_json::json!({
                        "position": { "row": pos.row, "col": pos.col },
                        "pressed": pressed,
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64,
                    }),
                );

                // Execute action on key press (not release)
                if pressed && actions_enabled {
                    self.execute_key_action(pos, *current_layer);
                }

                last_state[i] = pressed;
            }
        }

        // Update current layer based on active app
        let active_app = get_active_app();
        let keymap = self.keymap.lock().unwrap();
        let manual_override_active = {
            let manual_override = self.manual_override.lock().unwrap();
            manual_override.is_some()
        };

        if actions_enabled && !manual_override_active {
            let new_layer = keymap.determine_layer(active_app.as_deref(), *current_layer);

            if new_layer != *current_layer {
                *current_layer = new_layer;

                // Emit layer change event
                let _ = self.app_handle.emit(
                    "macro11:layer-change",
                    serde_json::json!({
                        "layer": new_layer,
                        "triggerApp": active_app,
                    }),
                );
            }
        }
    }

    /// Execute action for a key press
    fn execute_key_action(&self, pos: MatrixPosition, layer: u8) {
        let keymap = self.keymap.lock().unwrap();

        let action = match keymap.get_action(layer, pos) {
            Some(a) => a.clone(),
            None => {
                eprintln!("No action for key at {:?} on layer {}", pos, layer);
                return;
            }
        };
        let total_layers = keymap.layers.len().max(1) as u8;

        // Drop the keymap lock before executing action
        drop(keymap);

        let current_layer = self.current_layer.clone();
        let app_handle = self.app_handle.clone();
        let manual_override = self.manual_override.clone();
        let position = pos;
        let executor = self.action_executor.clone();

        thread::spawn(move || {
            let (previous_layer, new_layer, action_result) = {
                let mut layer_guard = current_layer.lock().unwrap();
                let previous_layer = *layer_guard;
                let result = executor.execute(&action, &mut layer_guard, total_layers);
                let new_layer = *layer_guard;
                (previous_layer, new_layer, result)
            };

            match action {
                Action::SwitchLayer { .. } | Action::CycleLayer { .. } => {
                    let mut override_guard = manual_override.lock().unwrap();
                    *override_guard = Some(new_layer);
                }
                Action::LaunchApp { .. } => {
                    let mut override_guard = manual_override.lock().unwrap();
                    *override_guard = None;
                }
                _ => {}
            }

            if new_layer != previous_layer {
                let _ = app_handle.emit(
                    "macro11:layer-change",
                    serde_json::json!({
                        "layer": new_layer,
                        "triggerApp": serde_json::Value::Null,
                    }),
                );
            }

            match action_result {
                Ok(()) => {
                    let _ = app_handle.emit(
                        "macro11:action-executed",
                        serde_json::json!({
                            "position": { "row": position.row, "col": position.col },
                            "layer": layer,
                            "action": action,
                        }),
                    );
                }
                Err(e) => {
                    eprintln!("Failed to execute action: {}", e);
                    let _ = app_handle.emit(
                        "macro11:action-error",
                        serde_json::json!({
                            "position": { "row": position.row, "col": position.col },
                            "layer": layer,
                            "error": e,
                        }),
                    );
                }
            }
        });
    }

    /// Convert flat index (0-10) to matrix position
    fn index_to_position(index: usize) -> MatrixPosition {
        match index {
            0..=2 => MatrixPosition::new(0, index as u8),
            3..=6 => MatrixPosition::new(1, (index - 3) as u8),
            7..=10 => MatrixPosition::new(2, (index - 7) as u8),
            _ => MatrixPosition::new(0, 0), // Should never happen
        }
    }

    /// Reload keymap from disk
    pub fn reload_keymap(&self) -> Result<(), String> {
        let path = get_active_keymap_path()?;
        let new_keymap = load_keymap(path)?;

        let mut keymap = self.keymap.lock().unwrap();
        *keymap = new_keymap;

        Ok(())
    }

    /// Get current layer number
    #[allow(dead_code)]
    pub fn get_current_layer(&self) -> u8 {
        *self.current_layer.lock().unwrap()
    }
}
