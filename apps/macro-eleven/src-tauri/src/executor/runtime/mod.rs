mod shortcuts;

pub use shortcuts::{KeyChord, ModifierKey, PrimaryKey, ShortcutSequence};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

mod noop;

/// Platform-specific runtime that knows how to launch apps and synthesize input.
pub trait PlatformRuntime: Send + Sync {
    fn launch_app(&self, app: &str, focus_if_running: bool) -> Result<(), String>;
    fn send_shortcut(&self, sequence: &ShortcutSequence) -> Result<(), String>;
    fn type_text(&self, text: &str) -> Result<(), String>;
    fn key_press(&self, key: &PrimaryKey) -> Result<(), String>;
    fn modifier_down(&self, modifier: ModifierKey) -> Result<(), String>;
    fn modifier_up(&self, modifier: ModifierKey) -> Result<(), String>;
}

/// Factory that builds the correct runtime for the host platform.
pub fn create_runtime() -> Result<Box<dyn PlatformRuntime>, String> {
    #[cfg(target_os = "macos")]
    {
        return macos::MacRuntime::new().map(|runtime| Box::new(runtime) as Box<dyn PlatformRuntime>);
    }

    #[cfg(target_os = "windows")]
    {
        return windows::WindowsRuntime::new()
            .map(|runtime| Box::new(runtime) as Box<dyn PlatformRuntime>);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(Box::new(noop::NoopRuntime::new()))
    }
}
