use tauri::AppHandle;

use serde::Deserialize;

use crate::config::settings::Settings;
use crate::shell::{overlay, panel, Backdrop};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Surface {
    Overlay,
    Panel,
}

/// Show or hide the overlay. Remembered for the next launch.
#[tauri::command]
pub fn set_overlay_visible(app: AppHandle, visible: bool) -> Result<Settings, String> {
    overlay::set_visible(&app, visible)
}

/// What a see-through window draws behind its content: glass, or solid
/// (the overlay's Solid setting, or Reduce Transparency).
#[tauri::command]
pub fn get_backdrop(app: AppHandle, surface: Surface) -> Backdrop {
    match surface {
        Surface::Overlay => overlay::backdrop(&app),
        Surface::Panel => panel::backdrop(),
    }
}

/// Reduce Transparency changed: check the backdrop again.
#[tauri::command]
pub fn refresh_overlay_backdrop(app: AppHandle) {
    overlay::refresh_material(&app);
}

/// Fade the overlay while nothing happens on the pad, and bring it back.
#[tauri::command]
pub fn set_overlay_dimmed(app: AppHandle, dimmed: bool) {
    overlay::set_dimmed(&app, dimmed);
}

/// Put the overlay back at its first size and place, and forget the saved one.
#[tauri::command]
pub fn reset_overlay_frame(app: AppHandle) {
    overlay::reset_frame(&app);
}
