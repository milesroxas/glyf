use std::thread;
use std::time::Duration;

use crate::config::keymap::{Action, MacroStep};
use crate::executor::runtime::{ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence};

/// Runs actions that talk to the OS. Layer actions change engine state and
/// never reach the executor.
pub struct ActionExecutor {
    runtime: Box<dyn PlatformRuntime>,
}

impl ActionExecutor {
    pub fn new(runtime: Box<dyn PlatformRuntime>) -> Self {
        Self { runtime }
    }

    pub fn execute(&self, action: &Action) -> Result<(), String> {
        match action {
            Action::LaunchApp {
                app,
                bundle_id,
                focus_if_running,
                ..
            } => self
                .runtime
                .launch_app(app, bundle_id.as_deref(), focus_if_running.unwrap_or(true)),
            Action::Shortcut { keys, .. } => self.send_shortcut(keys),
            Action::Macro { sequence, .. } => self.run_macro(sequence),
            Action::Plugin {
                plugin_id,
                action_id,
                ..
            } => Err(format!(
                "Plugins are not available yet ({plugin_id}:{action_id})"
            )),
            Action::CycleLayer { .. } | Action::SwitchLayer { .. } | Action::Noop { .. } => Ok(()),
        }
    }

    fn send_shortcut(&self, keys: &[String]) -> Result<(), String> {
        self.runtime.send_shortcut(&ShortcutSequence::from_keys(keys)?)
    }

    /// Run the steps in order. Modifiers still held at the end are released,
    /// even when a step fails, so a macro can never leave ⌘ stuck down.
    fn run_macro(&self, sequence: &[MacroStep]) -> Result<(), String> {
        let mut held: Vec<ModifierKey> = Vec::new();
        let result = sequence
            .iter()
            .try_for_each(|step| self.run_step(step, &mut held));
        for modifier in held.into_iter().rev() {
            let _ = self.runtime.modifier_up(modifier);
        }
        result
    }

    fn run_step(&self, step: &MacroStep, held: &mut Vec<ModifierKey>) -> Result<(), String> {
        match step {
            MacroStep::KeyDown { key } => match ModifierKey::from_token(key) {
                Some(modifier) => {
                    self.runtime.modifier_down(modifier)?;
                    if !held.contains(&modifier) {
                        held.push(modifier);
                    }
                    Ok(())
                }
                None => self.runtime.key_down(&PrimaryKey::from_token(key)?),
            },
            MacroStep::KeyUp { key } => match ModifierKey::from_token(key) {
                Some(modifier) => {
                    held.retain(|m| *m != modifier);
                    self.runtime.modifier_up(modifier)
                }
                None => self.runtime.key_up(&PrimaryKey::from_token(key)?),
            },
            MacroStep::KeyPress { key } => self.runtime.key_press(&PrimaryKey::from_token(key)?),
            MacroStep::Shortcut { keys } => self.send_shortcut(keys),
            MacroStep::Text { text } => self.runtime.type_text(text),
            MacroStep::Wait { ms } => {
                thread::sleep(Duration::from_millis(*ms));
                Ok(())
            }
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    /// Records every runtime call as text.
    #[derive(Clone, Default)]
    pub struct Recorder {
        pub calls: Arc<Mutex<Vec<String>>>,
        pub delay: Duration,
    }

    impl Recorder {
        pub fn calls(&self) -> Vec<String> {
            self.calls.lock().unwrap().clone()
        }

        fn record(&self, call: String) -> Result<(), String> {
            thread::sleep(self.delay);
            self.calls.lock().unwrap().push(call);
            Ok(())
        }
    }

    impl PlatformRuntime for Recorder {
        fn launch_app(&self, name: &str, bundle_id: Option<&str>, focus: bool) -> Result<(), String> {
            self.record(format!("launch {name} {bundle_id:?} {focus}"))
        }
        fn send_shortcut(&self, sequence: &ShortcutSequence) -> Result<(), String> {
            self.record(format!("shortcut {}", sequence.chords.len()))
        }
        fn type_text(&self, text: &str) -> Result<(), String> {
            self.record(format!("text {text}"))
        }
        fn key_press(&self, key: &PrimaryKey) -> Result<(), String> {
            self.record(format!("press {key:?}"))
        }
        fn key_down(&self, key: &PrimaryKey) -> Result<(), String> {
            self.record(format!("down {key:?}"))
        }
        fn key_up(&self, key: &PrimaryKey) -> Result<(), String> {
            self.record(format!("up {key:?}"))
        }
        fn modifier_down(&self, modifier: ModifierKey) -> Result<(), String> {
            self.record(format!("mod down {modifier:?}"))
        }
        fn modifier_up(&self, modifier: ModifierKey) -> Result<(), String> {
            self.record(format!("mod up {modifier:?}"))
        }
    }

    fn run(steps: serde_json::Value) -> (Result<(), String>, Vec<String>) {
        let recorder = Recorder::default();
        let executor = ActionExecutor::new(Box::new(recorder.clone()));
        let action: Action =
            serde_json::from_value(serde_json::json!({ "action": "macro", "sequence": steps }))
                .unwrap();
        (executor.execute(&action), recorder.calls())
    }

    #[test]
    fn held_modifiers_wrap_the_next_keys() {
        let (result, calls) = run(serde_json::json!([
            { "type": "keydown", "key": "cmd" },
            { "type": "keypress", "key": "c" },
            { "type": "keyup", "key": "cmd" }
        ]));
        result.unwrap();
        assert_eq!(
            calls,
            ["mod down Command", "press Character(\"c\")", "mod up Command"]
        );
    }

    #[test]
    fn keydown_and_keyup_press_a_key_once() {
        let (result, calls) = run(serde_json::json!([
            { "type": "keydown", "key": "a" },
            { "type": "keyup", "key": "a" }
        ]));
        result.unwrap();
        assert_eq!(calls, ["down Character(\"a\")", "up Character(\"a\")"]);
    }

    #[test]
    fn a_failed_macro_releases_held_modifiers() {
        let (result, calls) = run(serde_json::json!([
            { "type": "keydown", "key": "shift" },
            { "type": "keydown", "key": "cmd" },
            { "type": "keypress", "key": "hyper" },
            { "type": "text", "text": "never typed" }
        ]));
        assert!(result.is_err());
        assert_eq!(
            calls,
            ["mod down Shift", "mod down Command", "mod up Command", "mod up Shift"]
        );
    }

    #[test]
    fn launches_by_bundle_id() {
        let recorder = Recorder::default();
        let executor = ActionExecutor::new(Box::new(recorder.clone()));
        let action: Action = serde_json::from_value(serde_json::json!({
            "action": "launch_app", "app": "Notes", "bundleId": "com.apple.Notes", "focusIfRunning": false
        }))
        .unwrap();
        executor.execute(&action).unwrap();
        assert_eq!(recorder.calls(), ["launch Notes Some(\"com.apple.Notes\") false"]);
    }
}
