mod shortcuts;

pub use shortcuts::{KeyChord, ModifierKey, PrimaryKey, ShortcutSequence};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod noop;

/// Platform-specific runtime that knows how to launch apps and synthesize input.
pub trait PlatformRuntime: Send + Sync {
    /// Open `bundle_id` if given (falling back to `name`), else `name`.
    /// `focus` brings the app to the front.
    fn launch_app(&self, name: &str, bundle_id: Option<&str>, focus: bool) -> Result<(), String>;
    fn send_shortcut(&self, sequence: &ShortcutSequence) -> Result<(), String>;
    fn type_text(&self, text: &str) -> Result<(), String>;
    fn key_press(&self, key: &PrimaryKey) -> Result<(), String>;
    fn key_down(&self, key: &PrimaryKey) -> Result<(), String>;
    fn key_up(&self, key: &PrimaryKey) -> Result<(), String>;
    /// Hold a modifier: it applies to every key event until `modifier_up`.
    fn modifier_down(&self, modifier: ModifierKey) -> Result<(), String>;
    fn modifier_up(&self, modifier: ModifierKey) -> Result<(), String>;
}

/// Factory that builds the correct runtime for the host platform.
pub fn create_runtime() -> Box<dyn PlatformRuntime> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacRuntime::new())
    }

    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsRuntime)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Box::new(noop::NoopRuntime)
    }
}
