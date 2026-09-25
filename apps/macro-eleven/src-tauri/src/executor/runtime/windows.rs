use super::{ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence};

/// Placeholder until the Windows automation backend exists.
pub struct WindowsRuntime;

fn unsupported(action: &str) -> Result<(), String> {
    Err(format!("{action} is not implemented on Windows yet"))
}

impl PlatformRuntime for WindowsRuntime {
    fn launch_app(&self, _name: &str, _bundle_id: Option<&str>, _focus: bool) -> Result<(), String> {
        unsupported("Opening apps")
    }

    fn send_shortcut(&self, _sequence: &ShortcutSequence) -> Result<(), String> {
        unsupported("Sending shortcuts")
    }

    fn type_text(&self, _text: &str) -> Result<(), String> {
        unsupported("Typing text")
    }

    fn key_press(&self, _key: &PrimaryKey) -> Result<(), String> {
        unsupported("Pressing keys")
    }

    fn key_down(&self, _key: &PrimaryKey) -> Result<(), String> {
        unsupported("Pressing keys")
    }

    fn key_up(&self, _key: &PrimaryKey) -> Result<(), String> {
        unsupported("Pressing keys")
    }

    fn modifier_down(&self, _modifier: ModifierKey) -> Result<(), String> {
        unsupported("Holding modifiers")
    }

    fn modifier_up(&self, _modifier: ModifierKey) -> Result<(), String> {
        unsupported("Holding modifiers")
    }
}
