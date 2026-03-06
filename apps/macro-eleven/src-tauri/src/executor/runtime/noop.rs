use super::{ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence};

pub struct NoopRuntime;

impl NoopRuntime {
    pub fn new() -> Self {
        Self
    }

    fn not_supported(action: &str) -> Result<(), String> {
        Err(format!("Action '{}' is not supported on this platform yet", action))
    }
}

impl PlatformRuntime for NoopRuntime {
    fn launch_app(&self, _app: &str, _focus_if_running: bool) -> Result<(), String> {
        Self::not_supported("launch_app")
    }

    fn send_shortcut(&self, _sequence: &ShortcutSequence) -> Result<(), String> {
        Self::not_supported("shortcut")
    }

    fn type_text(&self, _text: &str) -> Result<(), String> {
        Self::not_supported("type_text")
    }

    fn key_press(&self, _key: &PrimaryKey) -> Result<(), String> {
        Self::not_supported("key_press")
    }

    fn modifier_down(&self, _modifier: ModifierKey) -> Result<(), String> {
        Self::not_supported("modifier_down")
    }

    fn modifier_up(&self, _modifier: ModifierKey) -> Result<(), String> {
        Self::not_supported("modifier_up")
    }
}
