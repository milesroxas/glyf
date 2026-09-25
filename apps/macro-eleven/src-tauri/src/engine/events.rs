//! Events the engine sends to the UI. A trait, so tests can record them.

use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Runtime};

use crate::config::keymap::{Action, MatrixPosition};

pub const KEY_PRESS: &str = "macro11:key-press";
pub const LAYER_CHANGE: &str = "macro11:layer-change";
pub const ACTION_EXECUTED: &str = "macro11:action-executed";
pub const ACTION_ERROR: &str = "macro11:action-error";
/// A profile's keymap changed, or another profile became active.
pub const KEYMAP_CHANGED: &str = "macro11:keymap-changed";

pub trait EngineEvents: Send + Sync {
    fn key_press(&self, position: MatrixPosition, pressed: bool);
    fn layer_changed(&self, layer: u8, trigger_app: Option<&str>);
    fn action_executed(&self, position: MatrixPosition, layer: u8, action: &Action);
    fn action_error(&self, position: MatrixPosition, layer: u8, error: &str);
}

impl<R: Runtime> EngineEvents for AppHandle<R> {
    fn key_press(&self, position: MatrixPosition, pressed: bool) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |d| d.as_millis() as u64);
        let _ = self.emit(
            KEY_PRESS,
            json!({ "position": position, "pressed": pressed, "timestamp": timestamp }),
        );
    }

    fn layer_changed(&self, layer: u8, trigger_app: Option<&str>) {
        let _ = self.emit(LAYER_CHANGE, json!({ "layer": layer, "triggerApp": trigger_app }));
    }

    fn action_executed(&self, position: MatrixPosition, layer: u8, action: &Action) {
        let _ = self.emit(
            ACTION_EXECUTED,
            json!({ "position": position, "layer": layer, "action": action }),
        );
    }

    fn action_error(&self, position: MatrixPosition, layer: u8, error: &str) {
        let _ = self.emit(
            ACTION_ERROR,
            json!({ "position": position, "layer": layer, "error": error }),
        );
    }
}
