//! macOS privacy permissions the executor needs.

/// System Settings › Privacy & Security › Accessibility.
pub const ACCESSIBILITY_SETTINGS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

pub const ACCESSIBILITY_REQUIRED: &str = "Macro Eleven needs Accessibility access to send keystrokes. Turn it on in System Settings › Privacy & Security › Accessibility.";

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    /// Returns a C `Boolean` (unsigned char).
    fn AXIsProcessTrusted() -> u8;
}

/// Whether this app may post synthetic key events.
#[cfg(target_os = "macos")]
pub fn accessibility_trusted() -> bool {
    // SAFETY: no arguments; reads the process's TCC state.
    unsafe { AXIsProcessTrusted() != 0 }
}

#[cfg(not(target_os = "macos"))]
pub fn accessibility_trusted() -> bool {
    true
}
