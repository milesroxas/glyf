//! The menu bar icon: the pad seen from above, filled while the pad is
//! connected. A click opens the panel; a right-click opens a short menu.
//! It can show the live layer's name beside it.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Listener, Manager, PhysicalPosition, PhysicalSize};

use super::{menu, panel};
use crate::config::settings::SettingsStore;
use crate::engine::events::{KEYMAP_CHANGED, LAYER_CHANGE};
use crate::engine::KeymapEngine;

const ID: &str = "macro11";
const DEVICE_STATUS: &str = "macro11:device-status";

// Template images (alpha only), 18 pt at 2x. `icons/tray/make_tray_icons.py`
// draws them.
const CONNECTED: &[u8] = include_bytes!("../../icons/tray/connected.png");
const DISCONNECTED: &[u8] = include_bytes!("../../icons/tray/disconnected.png");

/// Whether the pad is connected, for the icon and the tooltip.
#[derive(Default)]
pub struct TrayStatus {
    connected: AtomicBool,
}

fn tray(app: &AppHandle) -> Option<TrayIcon> {
    app.tray_by_id(ID)
}

fn tooltip(connected: bool) -> &'static str {
    if connected {
        "Macro Eleven: connected"
    } else {
        "Macro Eleven: not connected"
    }
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let context_menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, menu::OPEN, "Open Macro Eleven", true, None::<&str>)?,
            &MenuItem::with_id(app, menu::SETTINGS, "Settings…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, menu::QUIT, "Quit Macro Eleven", true, None::<&str>)?,
        ],
    )?;
    let settings = app.state::<SettingsStore>().get();
    let tray = TrayIconBuilder::with_id(ID)
        .icon(Image::from_bytes(DISCONNECTED)?)
        .icon_as_template(true)
        .tooltip(tooltip(false))
        .menu(&context_menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            // Open on press, not release, like a menu
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Down,
                rect,
                ..
            } = event
            {
                let position = rect.position.to_physical::<f64>(1.0);
                let size = rect.size.to_physical::<f64>(1.0);
                panel::toggle(tray.app_handle(), position, size);
            }
        })
        .build(app)?;
    let _ = tray.set_visible(settings.menu_bar_icon);

    let handle = app.clone();
    app.listen_any(DEVICE_STATUS, move |event| {
        let connected = serde_json::from_str::<serde_json::Value>(event.payload())
            .ok()
            .and_then(|payload| payload.get("connected")?.as_bool())
            .unwrap_or(false);
        set_connected(&handle, connected);
    });
    for event in [LAYER_CHANGE, KEYMAP_CHANGED] {
        let handle = app.clone();
        app.listen_any(event, move |_| refresh_title(&handle));
    }
    refresh_title(app);
    Ok(())
}

fn set_connected(app: &AppHandle, connected: bool) {
    let status = app.state::<TrayStatus>();
    if status.connected.swap(connected, Ordering::SeqCst) == connected {
        return;
    }
    let Some(tray) = tray(app) else {
        return;
    };
    let bytes = if connected { CONNECTED } else { DISCONNECTED };
    if let Ok(icon) = Image::from_bytes(bytes) {
        let _ = tray.set_icon_with_as_template(Some(icon), true);
    }
    let _ = tray.set_tooltip(Some(tooltip(connected)));
}

pub fn set_visible(app: &AppHandle, visible: bool) {
    if let Some(tray) = tray(app) {
        let _ = tray.set_visible(visible);
    }
}

/// The live layer's name beside the icon, when that setting is on.
pub fn refresh_title(app: &AppHandle) {
    let Some(tray) = tray(app) else {
        return;
    };
    let settings = app.state::<SettingsStore>().get();
    let title = (settings.menu_bar_icon && settings.menu_bar_layer)
        .then(|| app.state::<std::sync::Arc<KeymapEngine>>().snapshot().layer_name);
    let _ = tray.set_title(title);
}

/// The icon's frame in physical pixels, when it is in the menu bar.
pub fn rect(app: &AppHandle) -> Option<(PhysicalPosition<f64>, PhysicalSize<f64>)> {
    let rect = tray(app)?.rect().ok()??;
    Some((rect.position.to_physical(1.0), rect.size.to_physical(1.0)))
}

/// The icon stays pressed while the panel is open.
pub fn set_highlighted(app: &AppHandle, highlighted: bool) {
    #[cfg(target_os = "macos")]
    if let Some(tray) = tray(app) {
        let _ = tray.with_inner_tray_icon(move |inner| {
            if let Some(item) = inner.ns_status_item() {
                super::macos::set_status_item_highlighted(&item, highlighted);
            }
        });
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, highlighted);
}
