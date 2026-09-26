//! Keymap engine: turns key-state changes into actions and picks the layer.
//!
//! All state sits behind one lock that is only held for in-memory work.
//! Layer actions run inline; everything that talks to the OS goes to the
//! action worker. Reading the front app happens on its own thread, never
//! under the lock.

pub mod events;
mod knob;

use serde::Serialize;
use std::sync::{Arc, Mutex, MutexGuard, Weak};
use std::thread;
use std::time::Duration;

use crate::config::device::macro_eleven;
use crate::config::keymap::{Action, FrontApp, Keymap, MatrixPosition};
use crate::executor::actions::ActionExecutor;
use crate::executor::app_detector;
use crate::executor::runtime::PlatformRuntime;
use crate::executor::volume::SystemVolume;
use crate::executor::worker::ActionWorker;
use crate::hid::connection::KeyStateSink;
use crate::hid::protocol::KEY_COUNT;
use events::EngineEvents;
use knob::KnobVolume;

const FRONT_APP_INTERVAL: Duration = Duration::from_millis(250);

struct EngineState {
    profile: String,
    keymap: Keymap,
    layer: u8,
    /// Set by a layer key; the front app does not change the layer until
    /// the front app changes.
    manual_override: bool,
    last_keys: [bool; KEY_COUNT],
    front_app: Option<FrontApp>,
}

impl EngineState {
    /// Apply a layer action. Returns the new layer if it changed.
    fn apply_layer_action(&mut self, action: &Action) -> Result<Option<u8>, String> {
        let target = match action {
            Action::SwitchLayer { layer, .. } if self.keymap.layers.contains_key(layer) => *layer,
            Action::SwitchLayer { layer, .. } => {
                return Err(format!("Layer {layer} does not exist"));
            }
            Action::CycleLayer { .. } => self.keymap.next_layer(self.layer),
            _ => return Ok(None),
        };
        self.manual_override = true;
        Ok(self.set_layer(target))
    }

    fn set_layer(&mut self, layer: u8) -> Option<u8> {
        (layer != self.layer).then(|| {
            self.layer = layer;
            layer
        })
    }

    fn follow_front_app(&mut self) -> Option<u8> {
        if self.manual_override {
            return None;
        }
        let layer = self.keymap.layer_for_app(self.front_app.as_ref(), self.layer);
        self.set_layer(layer)
    }

    fn front_app_name(&self) -> Option<String> {
        self.front_app.as_ref().map(|app| app.name.clone())
    }
}

/// Work to do once the state lock is released.
enum Effect {
    KeyPress(MatrixPosition, bool),
    Layer(u8, Option<String>),
    Executed(MatrixPosition, u8, Action),
    Failed(MatrixPosition, u8, String),
    Run(Action, MatrixPosition, u8),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineSnapshot {
    pub layer: u8,
    pub active_profile: String,
}

pub struct KeymapEngine {
    state: Mutex<EngineState>,
    worker: ActionWorker,
    knob: KnobVolume,
    events: Arc<dyn EngineEvents>,
}

impl KeymapEngine {
    pub fn new(
        profile: String,
        keymap: Keymap,
        runtime: Box<dyn PlatformRuntime>,
        volume: Box<dyn SystemVolume>,
        events: Arc<dyn EngineEvents>,
    ) -> Self {
        Self {
            state: Mutex::new(EngineState {
                profile,
                keymap,
                layer: 0,
                manual_override: false,
                last_keys: [false; KEY_COUNT],
                front_app: None,
            }),
            worker: ActionWorker::spawn(ActionExecutor::new(runtime), events.clone()),
            knob: KnobVolume::spawn(volume),
            events,
        }
    }

    fn lock(&self) -> MutexGuard<'_, EngineState> {
        // State stays consistent across a panic: every write is a plain store
        self.state.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn dispatch(&self, effects: Vec<Effect>) {
        for effect in effects {
            match effect {
                Effect::KeyPress(position, pressed) => self.events.key_press(position, pressed),
                Effect::Layer(layer, app) => self.events.layer_changed(layer, app.as_deref()),
                Effect::Executed(position, layer, action) => {
                    self.events.action_executed(position, layer, &action)
                }
                Effect::Failed(position, layer, error) => {
                    self.events.action_error(position, layer, &error)
                }
                Effect::Run(action, position, layer) => {
                    self.worker.submit_key(action, position, layer)
                }
            }
        }
    }

    /// Handle a key-state report. Runs the action of each newly pressed key
    /// when `actions_enabled` (host control) is on.
    pub fn process_keys(&self, keys: &[bool; KEY_COUNT], actions_enabled: bool) {
        let mut effects = Vec::new();
        {
            let mut state = self.lock();
            let previous = std::mem::replace(&mut state.last_keys, *keys);
            for (index, (&pressed, was_pressed)) in keys.iter().zip(previous).enumerate() {
                let Some(position) = macro_eleven().position(index) else {
                    continue;
                };
                if pressed == was_pressed {
                    continue;
                }
                effects.push(Effect::KeyPress(position, pressed));
                if pressed && actions_enabled {
                    Self::press(&mut state, position, &mut effects);
                }
            }
        }
        self.dispatch(effects);
    }

    fn press(state: &mut EngineState, position: MatrixPosition, effects: &mut Vec<Effect>) {
        let layer = state.layer;
        let Some(action) = state.keymap.get_action(layer, position).cloned() else {
            return;
        };
        match action {
            Action::SwitchLayer { .. } | Action::CycleLayer { .. } => {
                match state.apply_layer_action(&action) {
                    Ok(changed) => {
                        effects.extend(changed.map(|l| Effect::Layer(l, None)));
                        effects.push(Effect::Executed(position, layer, action));
                    }
                    Err(error) => effects.push(Effect::Failed(position, layer, error)),
                }
            }
            Action::Noop { .. } => {}
            Action::LaunchApp { .. } => {
                // Opening an app hands the layer back to the front app
                state.manual_override = false;
                effects.push(Effect::Run(action, position, layer));
            }
            _ => effects.push(Effect::Run(action, position, layer)),
        }
    }

    /// Called with the current front app. A change of app clears a manual
    /// layer choice.
    pub fn set_front_app(&self, app: Option<FrontApp>) {
        let mut effects = Vec::new();
        {
            let mut state = self.lock();
            if state.front_app != app {
                state.front_app = app;
                state.manual_override = false;
            }
            if let Some(layer) = state.follow_front_app() {
                effects.push(Effect::Layer(layer, state.front_app_name()));
            }
        }
        self.dispatch(effects);
    }

    /// Swap in a keymap without a restart (profile saved or switched). A
    /// layer picked with a layer key holds across saves of the same profile,
    /// as long as that layer still exists.
    pub fn set_keymap(&self, profile: String, keymap: Keymap) {
        let mut effects = Vec::new();
        {
            let mut state = self.lock();
            let before = state.layer;
            let same_profile = state.profile == profile;
            state.profile = profile;
            state.keymap = keymap;
            if !state.keymap.layers.contains_key(&state.layer) {
                state.layer = 0;
                state.manual_override = false;
            } else if !same_profile {
                state.manual_override = false;
            }
            state.follow_front_app();
            if state.layer != before {
                effects.push(Effect::Layer(state.layer, state.front_app_name()));
            }
        }
        self.dispatch(effects);
    }

    /// Run an action for the designer's "Try" button and wait for the result.
    pub fn run_action(&self, action: Action) -> Result<(), String> {
        if !matches!(action, Action::SwitchLayer { .. } | Action::CycleLayer { .. }) {
            return self.worker.run(action);
        }
        let (result, effects) = {
            let mut state = self.lock();
            let result = state.apply_layer_action(&action);
            let effects: Vec<_> = result
                .as_ref()
                .ok()
                .copied()
                .flatten()
                .map(|layer| Effect::Layer(layer, None))
                .into_iter()
                .collect();
            (result, effects)
        };
        self.dispatch(effects);
        result.map(|_| ())
    }

    pub fn snapshot(&self) -> EngineSnapshot {
        let state = self.lock();
        EngineSnapshot {
            layer: state.layer,
            active_profile: state.profile.clone(),
        }
    }
}

impl KeyStateSink for KeymapEngine {
    fn process_keys(&self, keys: &[bool; KEY_COUNT], host_control: bool) {
        KeymapEngine::process_keys(self, keys, host_control);
    }

    fn process_knob(&self, reading: Option<u16>) {
        self.knob.report(reading);
    }
}

/// Poll the front app on a background thread for as long as the engine lives.
pub fn watch_front_app(engine: &Arc<KeymapEngine>) {
    let engine: Weak<KeymapEngine> = Arc::downgrade(engine);
    thread::Builder::new()
        .name("macro11-front-app".into())
        .spawn(move || {
            while let Some(engine) = engine.upgrade() {
                engine.set_front_app(app_detector::front_app());
                drop(engine);
                thread::sleep(FRONT_APP_INTERVAL);
            }
        })
        .expect("spawn the front-app thread");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::executor::actions::tests::Recorder;
    use crate::executor::volume::tests::FakeVolume;
    use serde_json::json;
    use std::time::Instant;

    #[derive(Default)]
    struct Heard(Mutex<Vec<String>>);

    impl Heard {
        fn take(&self) -> Vec<String> {
            std::mem::take(&mut self.0.lock().unwrap())
        }
    }

    impl EngineEvents for Heard {
        fn key_press(&self, position: MatrixPosition, pressed: bool) {
            self.0.lock().unwrap().push(format!("key {} {pressed}", position.to_key()));
        }
        fn layer_changed(&self, layer: u8, trigger_app: Option<&str>) {
            self.0.lock().unwrap().push(format!("layer {layer} {trigger_app:?}"));
        }
        fn action_executed(&self, position: MatrixPosition, layer: u8, _action: &Action) {
            self.0.lock().unwrap().push(format!("ok {} {layer}", position.to_key()));
        }
        fn action_error(&self, position: MatrixPosition, layer: u8, error: &str) {
            self.0
                .lock()
                .unwrap()
                .push(format!("error {} {layer} {error}", position.to_key()));
        }
    }

    fn keymap() -> Keymap {
        serde_json::from_value(json!({
            "version": "1", "name": "test",
            "layers": {
                "0": { "name": "base", "keys": {
                    "0,0": { "action": "cycle_layer" },
                    "0,1": { "action": "switch_layer", "layer": 5 },
                    "0,2": { "action": "shortcut", "keys": ["cmd", "t"] },
                    "1,0": { "action": "shortcut", "keys": ["cmd", "w"] },
                    "1,1": { "action": "launch_app", "app": "Notes" }
                } },
                "5": { "name": "five", "triggerApp": "com.apple.Notes", "keys": {
                    "0,0": { "action": "switch_layer", "layer": 9 }
                } }
            }
        }))
        .unwrap()
    }

    fn engine(delay: Duration) -> (KeymapEngine, Recorder, Arc<Heard>) {
        let recorder = Recorder {
            delay,
            ..Default::default()
        };
        let heard = Arc::new(Heard::default());
        let engine = KeymapEngine::new(
            "Test".into(),
            keymap(),
            Box::new(recorder.clone()),
            Box::new(FakeVolume::new(0.5)),
            heard.clone(),
        );
        (engine, recorder, heard)
    }

    /// Press then release the key at firmware index `index`.
    fn tap(engine: &KeymapEngine, index: usize) {
        let mut keys = [false; KEY_COUNT];
        keys[index] = true;
        engine.process_keys(&keys, true);
        engine.process_keys(&[false; KEY_COUNT], true);
    }

    fn wait_for(recorder: &Recorder, count: usize) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while recorder.calls().len() < count && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(5));
        }
    }

    #[test]
    fn slow_actions_never_block_key_handling_and_run_in_order() {
        let (engine, recorder, _heard) = engine(Duration::from_millis(300));
        let start = Instant::now();
        tap(&engine, 2); // ⌘T
        tap(&engine, 3); // ⌘W
        assert!(start.elapsed() < Duration::from_millis(50), "{:?}", start.elapsed());
        wait_for(&recorder, 2);
        assert_eq!(recorder.calls(), ["shortcut 1", "shortcut 1"]);
    }

    #[test]
    fn reports_edges_only() {
        let (engine, _recorder, heard) = engine(Duration::ZERO);
        let mut keys = [false; KEY_COUNT];
        keys[4] = true;
        engine.process_keys(&keys, false);
        engine.process_keys(&keys, false);
        engine.process_keys(&[false; KEY_COUNT], false);
        assert_eq!(heard.take(), ["key 1,1 true", "key 1,1 false"]);
    }

    #[test]
    fn layer_keys_follow_sparse_ids_and_reject_missing_layers() {
        let (engine, _recorder, heard) = engine(Duration::ZERO);
        tap(&engine, 0); // cycle 0 → 5
        assert_eq!(engine.snapshot().layer, 5);
        tap(&engine, 0); // on layer 5: switch to missing layer 9
        assert_eq!(engine.snapshot().layer, 5);
        let events = heard.take();
        assert!(events.contains(&"layer 5 None".to_string()), "{events:?}");
        assert!(
            events.contains(&"error 0,0 5 Layer 9 does not exist".to_string()),
            "{events:?}"
        );
    }

    #[test]
    fn manual_layer_holds_until_the_front_app_changes() {
        let (engine, _recorder, _heard) = engine(Duration::ZERO);
        let notes = FrontApp {
            name: "Notes".into(),
            bundle_id: Some("com.apple.Notes".into()),
        };
        engine.set_front_app(Some(notes.clone()));
        assert_eq!(engine.snapshot().layer, 5);

        engine.run_action(serde_json::from_value(json!({ "action": "switch_layer", "layer": 0 })).unwrap()).unwrap();
        engine.set_front_app(Some(notes));
        assert_eq!(engine.snapshot().layer, 0, "override holds for the same app");

        engine.set_front_app(Some(FrontApp {
            name: "Mail".into(),
            bundle_id: None,
        }));
        engine.set_front_app(Some(FrontApp {
            name: "Notes".into(),
            bundle_id: Some("com.apple.Notes".into()),
        }));
        assert_eq!(engine.snapshot().layer, 5, "a new front app clears it");
    }

    #[test]
    fn saving_the_same_profile_keeps_a_manual_layer() {
        let (engine, _recorder, _heard) = engine(Duration::ZERO);
        engine.set_front_app(Some(FrontApp {
            name: "Mail".into(),
            bundle_id: None,
        }));
        tap(&engine, 1); // switch to 5 by hand
        engine.set_keymap("Test".into(), keymap());
        assert_eq!(engine.snapshot().layer, 5, "a save keeps the layer");

        let mut defaulted = keymap();
        defaulted.settings = Some(crate::config::keymap::KeymapSettings {
            default_layer: Some(0),
            ..Default::default()
        });
        engine.set_keymap("Other".into(), defaulted);
        assert_eq!(engine.snapshot().layer, 0, "a new profile follows the front app");
    }

    #[test]
    fn hot_reload_moves_off_a_deleted_layer() {
        let (engine, recorder, _heard) = engine(Duration::ZERO);
        tap(&engine, 1); // switch to 5
        assert_eq!(engine.snapshot().layer, 5);
        let mut next = keymap();
        next.layers.remove(&5);
        next.layers.get_mut(&0).unwrap().keys.remove("0,1");
        engine.set_keymap("Other".into(), next);
        let snapshot = engine.snapshot();
        assert_eq!((snapshot.layer, snapshot.active_profile.as_str()), (0, "Other"));

        tap(&engine, 2);
        wait_for(&recorder, 1);
        assert_eq!(recorder.calls(), ["shortcut 1"], "the new keymap is live");
    }

    #[test]
    fn try_returns_the_result() {
        let (engine, recorder, heard) = engine(Duration::ZERO);
        let action: Action = serde_json::from_value(json!({ "action": "shortcut", "keys": ["cmd", "k"] })).unwrap();
        engine.run_action(action).unwrap();
        assert_eq!(recorder.calls(), ["shortcut 1"]);
        assert!(heard.take().is_empty(), "a try sends no action event");
    }
}
