use std::thread;
use std::time::Duration;

use crate::config::keymap::{Action, MacroStep};
use crate::executor::runtime::{
    create_runtime, ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence,
};

/// High-level executor that keeps layer state in sync and dispatches to platform runtimes.
pub struct ActionExecutor {
    runtime: Box<dyn PlatformRuntime>,
}

impl ActionExecutor {
    pub fn new() -> Result<Self, String> {
        let runtime = create_runtime()?;
        Ok(Self { runtime })
    }

    pub fn execute(
        &self,
        action: &Action,
        current_layer: &mut u8,
        total_layers: u8,
    ) -> Result<(), String> {
        let total_layers = total_layers.max(1);

        match action {
            Action::CycleLayer { .. } => {
                *current_layer = (*current_layer + 1) % total_layers;
                Ok(())
            }
            Action::SwitchLayer { layer, .. } => {
                *current_layer = (*layer).min(total_layers - 1);
                Ok(())
            }
            Action::LaunchApp {
                app,
                focus_if_running,
                ..
            } => self
                .runtime
                .launch_app(app, focus_if_running.unwrap_or(true)),
            Action::Shortcut { keys, .. } => self.handle_shortcut(keys),
            Action::Macro { sequence, .. } => self.handle_macro(sequence),
            Action::Plugin {
                plugin_id,
                action_id,
                ..
            } => Err(format!(
                "Plugin system not yet implemented: {}:{}",
                plugin_id, action_id
            )),
            Action::Noop { .. } => Ok(()),
        }
    }

    fn handle_shortcut(&self, keys: &[String]) -> Result<(), String> {
        let sequence = ShortcutSequence::from_keys(keys)?;
        self.runtime.send_shortcut(&sequence)
    }

    fn handle_macro(&self, sequence: &[MacroStep]) -> Result<(), String> {
        for step in sequence {
            match step {
                MacroStep::KeyDown { key } => {
                    if let Some(modifier) = ModifierKey::from_token(key) {
                        self.runtime.modifier_down(modifier)?;
                    } else {
                        let primary = PrimaryKey::from_token(key)?;
                        self.runtime.key_press(&primary)?;
                    }
                }
                MacroStep::KeyUp { key } => {
                    if let Some(modifier) = ModifierKey::from_token(key) {
                        self.runtime.modifier_up(modifier)?;
                    } else {
                        let primary = PrimaryKey::from_token(key)?;
                        self.runtime.key_press(&primary)?;
                    }
                }
                MacroStep::KeyPress { key } => {
                    let primary = PrimaryKey::from_token(key)?;
                    self.runtime.key_press(&primary)?;
                }
                MacroStep::Shortcut { keys } => {
                    self.handle_shortcut(keys)?;
                }
                MacroStep::Text { text } => {
                    self.runtime.type_text(text)?;
                }
                MacroStep::Wait { ms } => {
                    thread::sleep(Duration::from_millis(*ms));
                }
            }
        }
        Ok(())
    }
}
