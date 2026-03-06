use super::{ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence};

pub struct WindowsRuntime;

impl WindowsRuntime {
    pub fn new() -> Result<Self, String> {
        // Placeholder implementation; real Windows automation backend TBD.
        Ok(Self)
    }

    fn unsupported(action: &str) -> Result<(), String> {
        Err(format!(
            "Windows action '{}' is not implemented yet",
            action
        ))
    }
}

impl PlatformRuntime for WindowsRuntime {
    fn launch_app(&self, _app: &str, _focus_if_running: bool) -> Result<(), String> {
        Self::unsupported("launch_app")
    }

    fn send_shortcut(&self, _sequence: &ShortcutSequence) -> Result<(), String> {
        Self::unsupported("shortcut")
    }

    fn type_text(&self, _text: &str) -> Result<(), String> {
        Self::unsupported("type_text")
    }

    fn key_press(&self, _key: &PrimaryKey) -> Result<(), String> {
        Self::unsupported("key_press")
    }

    fn modifier_down(&self, _modifier: ModifierKey) -> Result<(), String> {
        Self::unsupported("modifier_down")
    }

    fn modifier_up(&self, _modifier: ModifierKey) -> Result<(), String> {
        Self::unsupported("modifier_up")
    }
}
