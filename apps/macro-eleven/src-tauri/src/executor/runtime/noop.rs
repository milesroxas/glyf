use super::{ModifierKey, PlatformRuntime, PrimaryKey, ShortcutSequence};

pub struct NoopRuntime;

fn not_supported(action: &str) -> Result<(), String> {
    Err(format!("{action} is not supported on this platform yet"))
}

impl PlatformRuntime for NoopRuntime {
    fn launch_app(&self, _name: &str, _bundle_id: Option<&str>, _focus: bool) -> Result<(), String> {
        not_supported("Opening apps")
    }

    fn send_shortcut(&self, _sequence: &ShortcutSequence) -> Result<(), String> {
        not_supported("Sending shortcuts")
    }

    fn type_text(&self, _text: &str) -> Result<(), String> {
        not_supported("Typing text")
    }

    fn key_press(&self, _key: &PrimaryKey) -> Result<(), String> {
        not_supported("Pressing keys")
    }

    fn key_down(&self, _key: &PrimaryKey) -> Result<(), String> {
        not_supported("Pressing keys")
    }

    fn key_up(&self, _key: &PrimaryKey) -> Result<(), String> {
        not_supported("Pressing keys")
    }

    fn modifier_down(&self, _modifier: ModifierKey) -> Result<(), String> {
        not_supported("Holding modifiers")
    }

    fn modifier_up(&self, _modifier: ModifierKey) -> Result<(), String> {
        not_supported("Holding modifiers")
    }
}
