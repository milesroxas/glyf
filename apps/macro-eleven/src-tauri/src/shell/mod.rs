//! The app around the engine: windows, the menu bar icon and its panel, the
//! Dock icon, the app menu, the overlay shortcut, and Open at Login.
//!
//! Closing a window never quits. The pad only works while the app runs, so
//! the app lives on in the menu bar until the user quits it.

#[cfg(target_os = "macos")]
pub mod macos;
pub mod menu;
pub mod overlay;
pub mod panel;
pub mod shortcut;
pub mod tray;
pub mod windows;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::config::settings::{Settings, SettingsStore};

/// Every window hears the new settings.
pub const SETTINGS_CHANGED: &str = "macro11:settings-changed";

/// What a see-through window (the overlay, the panel) draws behind its
/// content, after Reduce Transparency.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Backdrop {
    /// The window is glass; the page draws only a tint.
    Glass,
    /// The page paints an opaque background.
    Solid,
}

/// System Settings › Accessibility › Display › Reduce transparency.
pub fn reduce_transparency() -> bool {
    #[cfg(target_os = "macos")]
    return macos::reduce_transparency();
    #[cfg(not(target_os = "macos"))]
    true
}

/// Whether macOS opens the app at login, as System Settings shows it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LoginItemStatus {
    Enabled,
    Disabled,
    /// Turned on, but the user must allow it in System Settings.
    RequiresApproval,
    /// Not available: macOS cannot find the app (a development build).
    Unavailable,
}

pub fn login_item_status() -> LoginItemStatus {
    #[cfg(target_os = "macos")]
    return macos::login_item_status();
    #[cfg(not(target_os = "macos"))]
    LoginItemStatus::Unavailable
}

pub fn set_login_item(enabled: bool) -> Result<LoginItemStatus, String> {
    #[cfg(target_os = "macos")]
    return macos::set_login_item(enabled);
    #[cfg(not(target_os = "macos"))]
    {
        let _ = enabled;
        Err("Open at Login is only available on macOS".into())
    }
}

pub fn open_login_items_settings() {
    #[cfg(target_os = "macos")]
    macos::open_login_items_settings();
}

/// Whether macOS opened the app as a login item. Only true during launch.
pub fn launched_at_login() -> bool {
    #[cfg(target_os = "macos")]
    return macos::launched_at_login();
    #[cfg(not(target_os = "macos"))]
    false
}

/// Make the app match `next`: the menu bar icon, the Dock, the overlay
/// window, and the overlay shortcut. `before` is what was applied last.
pub fn apply_settings(app: &AppHandle, before: Option<&Settings>, next: &Settings) {
    let changed = |field: fn(&Settings) -> bool| before.is_none_or(|b| field(b) != field(next));

    if changed(|s| s.menu_bar_icon) {
        tray::set_visible(app, next.menu_bar_icon);
        if !next.menu_bar_icon {
            panel::hide(app);
        }
    }
    if changed(|s| s.menu_bar_icon) || changed(|s| s.menu_bar_layer) {
        tray::refresh_title(app);
    }
    if changed(|s| s.dock_icon) || changed(|s| s.menu_bar_icon) {
        windows::update_dock(app);
    }
    overlay::apply(app, before, next);
}

/// Merge `patch` into the saved settings, apply it, and tell every window.
pub fn update_settings(
    app: &AppHandle,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Settings, String> {
    let store = app.state::<SettingsStore>();
    // A shortcut another app holds is refused before anything is saved
    let current = store.get();
    let proposed = current.merged(patch)?;
    if proposed.overlay_shortcut != current.overlay_shortcut {
        shortcut::replace(app, &current.overlay_shortcut, &proposed.overlay_shortcut)?;
    }
    let (before, next) = store.update(patch)?;
    if before != next {
        apply_settings(app, Some(&before), &next);
        let _ = app.emit(SETTINGS_CHANGED, &next);
    }
    Ok(next)
}
