//! The main window (the designer) and the Settings window: both hide on
//! close, and the Dock icon shows only while one of them is open.

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use super::panel;
use crate::config::settings::SettingsStore;

pub const MAIN: &str = "main";
pub const SETTINGS: &str = "settings";

/// Tells the main window which page to show, e.g. `/firmware`.
pub const NAVIGATE: &str = "macro11:navigate";

/// Settings panes are this wide; each pane sets the height.
const SETTINGS_WIDTH: f64 = 560.0;
/// Before the first pane measures itself.
const SETTINGS_HEIGHT: f64 = 440.0;
/// The window appears once its pane has measured itself, or after this.
const SETTINGS_SHOW_FALLBACK: Duration = Duration::from_millis(600);
/// Height changes between panes, like System Settings.
const PANE_RESIZE_SECONDS: f64 = 0.24;
/// The first-close tip waits for focus to move to the next app, or the
/// panel would lose the keyboard at once and close.
const TIP_DELAY: Duration = Duration::from_millis(350);

/// Which regular windows are open, for the Dock icon.
#[derive(Default)]
pub struct OpenWindows {
    main: AtomicBool,
    settings: AtomicBool,
}

impl OpenWindows {
    fn flag(&self, label: &str) -> Option<&AtomicBool> {
        match label {
            MAIN => Some(&self.main),
            SETTINGS => Some(&self.settings),
            _ => None,
        }
    }

    fn any(&self) -> bool {
        self.main.load(Ordering::SeqCst) || self.settings.load(Ordering::SeqCst)
    }
}

/// Settings was asked to open but is not on screen yet: it waits for its
/// pane to measure itself.
fn settings_pending(app: &AppHandle, window: &WebviewWindow) -> bool {
    app.state::<OpenWindows>().settings.load(Ordering::SeqCst)
        && !window.is_visible().unwrap_or(true)
}

fn set_open(app: &AppHandle, label: &str, open: bool) {
    if let Some(flag) = app.state::<OpenWindows>().flag(label) {
        flag.store(open, Ordering::SeqCst);
    }
    update_dock(app);
}

/// The Dock icon (and the app's menu bar and ⌘-Tab entry) shows while the
/// designer or Settings is open, unless the user turned it off. With the
/// menu bar icon hidden, the Dock icon is the only way back to the app, so
/// it stays whether or not a window is open.
pub fn update_dock(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        let settings = app.state::<SettingsStore>().get();
        let open = app.state::<OpenWindows>().any();
        let policy = if dock_visible(settings.menu_bar_icon, settings.dock_icon, open) {
            tauri::ActivationPolicy::Regular
        } else {
            tauri::ActivationPolicy::Accessory
        };
        let _ = app.set_activation_policy(policy);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn dock_visible(menu_bar_icon: bool, dock_icon: bool, window_open: bool) -> bool {
    !menu_bar_icon || (dock_icon && window_open)
}

fn present(app: &AppHandle, window: &WebviewWindow) {
    set_open(app, window.label(), true);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

/// Show the designer, optionally on one page (`/firmware`).
pub fn show_main(app: &AppHandle, route: Option<&str>) {
    panel::hide(app);
    let Some(window) = app.get_webview_window(MAIN) else {
        return;
    };
    present(app, &window);
    if let Some(route) = route {
        let _ = window.emit_to(MAIN, NAVIGATE, route);
    }
}

/// Open Settings, or bring it forward.
pub fn show_settings(app: &AppHandle) {
    panel::hide(app);
    if let Some(window) = app.get_webview_window(SETTINGS) {
        present(app, &window);
        return;
    }
    let builder = WebviewWindowBuilder::new(app, SETTINGS, WebviewUrl::App("index.html".into()))
        .title("Settings")
        .inner_size(SETTINGS_WIDTH, SETTINGS_HEIGHT)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .visible(false)
        .center()
        .theme(Some(tauri::Theme::Dark))
        // The window color (--background), so it never flashes white
        .background_color(tauri::window::Color(10, 10, 10, 255))
        .initialization_script("window.location.hash = '#/settings';");
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    match builder.build() {
        Ok(_) => {
            set_open(app, SETTINGS, true);
            // In case the page never reports its height
            let app = app.clone();
            thread::spawn(move || {
                thread::sleep(SETTINGS_SHOW_FALLBACK);
                if let Some(window) = app.get_webview_window(SETTINGS) {
                    if settings_pending(&app, &window) {
                        present(&app, &window);
                    }
                }
            });
        }
        Err(e) => eprintln!("Could not open Settings: {e}"),
    }
}

/// The Settings page measured its pane: size the window to it. The first
/// measurement shows the window at that size; later ones animate, with the
/// top edge still.
pub fn fit_settings(app: &AppHandle, height: f64) {
    let Some(window) = app.get_webview_window(SETTINGS) else {
        return;
    };
    let first = settings_pending(app, &window);
    #[cfg(target_os = "macos")]
    {
        let animate = (!first).then_some(PANE_RESIZE_SECONDS);
        super::macos::with_ns_window(&window, move |ns_window| {
            super::macos::resize_top_anchored(ns_window, SETTINGS_WIDTH, height, animate);
            if first {
                ns_window.center();
            }
        });
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window.set_size(tauri::LogicalSize::new(SETTINGS_WIDTH, height));
    if first {
        let app = app.clone();
        // After the resize above, which runs on the main thread first
        let _ = window.clone().run_on_main_thread(move || present(&app, &window));
    }
}

/// The red button, ⌘W, or Window › Close: hide instead of closing, so the
/// app keeps running in the menu bar. The first time the designer closes,
/// the menu bar panel opens to show where the app went.
pub fn hide(app: &AppHandle, window: &WebviewWindow) {
    let _ = window.hide();
    set_open(app, window.label(), false);
    if window.label() == MAIN {
        let store = app.state::<SettingsStore>();
        let first_close = !store.window_state().close_tip_shown;
        if first_close && store.get().menu_bar_icon {
            store.update_window_state(|state| state.close_tip_shown = true);
            let app = app.clone();
            thread::spawn(move || {
                thread::sleep(TIP_DELAY);
                let handle = app.clone();
                let _ = app.run_on_main_thread(move || panel::show_tip(&handle));
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::dock_visible;

    #[test]
    fn dock_icon_follows_open_windows_and_the_setting() {
        assert!(dock_visible(true, true, true));
        assert!(!dock_visible(true, true, false));
        assert!(!dock_visible(true, false, true));
    }

    #[test]
    fn dock_icon_stays_while_the_menu_bar_icon_is_hidden() {
        assert!(dock_visible(false, false, false));
        assert!(dock_visible(false, true, false));
    }
}
