//! The menu bar panel: a Liquid Glass sheet under the menu bar icon with
//! the live pad, profiles, and the overlay switch. It is made at launch and
//! hidden, so the first click opens it at once. It closes when it loses the
//! keyboard, on Esc, or on a second click of the icon, like a menu.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize,
    WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

use super::{tray, Backdrop};

pub const LABEL: &str = "macro11-panel";

/// The panel opened. The page resets and plays its entrance.
pub const SHOWN: &str = "macro11:panel-shown";

pub const WIDTH: f64 = 320.0;
/// Until the page measures itself.
const HEIGHT: f64 = 420.0;
/// Space between the menu bar and the panel.
const GAP: f64 = 6.0;
/// Kept clear of the screen's side edges.
const EDGE_MARGIN: f64 = 8.0;
/// A click on the icon that closed the panel (it lost focus to the click)
/// must not open it again.
const REOPEN_GUARD: Duration = Duration::from_millis(250);
#[cfg(target_os = "macos")]
const CORNER_RADIUS: f64 = 18.0;
#[cfg(target_os = "macos")]
const FADE_IN_SECONDS: f64 = 0.12;
#[cfg(target_os = "macos")]
const FADE_OUT_SECONDS: f64 = 0.1;

#[derive(Clone, Serialize)]
struct Shown {
    /// The one-time tip after the designer first closes.
    tip: bool,
    /// Checked on every open, so Reduce Transparency applies at once.
    backdrop: Backdrop,
}

#[derive(Default)]
pub struct PanelState {
    visible: AtomicBool,
    hidden_at: Mutex<Option<Instant>>,
    /// Bumped on every show and hide, so a finished fade-out knows whether
    /// the panel opened again meanwhile.
    generation: AtomicU64,
    height: Mutex<Option<f64>>,
}

/// A rectangle in logical points, top-left origin.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Where the panel goes: centered under the icon, just below the menu bar,
/// and inside the screen.
pub fn place(icon: Rect, screen: Rect, width: f64) -> (f64, f64) {
    let centered = icon.x + icon.width / 2.0 - width / 2.0;
    let min = screen.x + EDGE_MARGIN;
    let max = (screen.x + screen.width - width - EDGE_MARGIN).max(min);
    (centered.clamp(min, max), icon.y + icon.height + GAP)
}

/// The icon and its screen in logical points. The tray reports physical
/// pixels at the icon's screen's scale.
fn locate(app: &AppHandle, position: PhysicalPosition<f64>, size: PhysicalSize<f64>) -> Option<(Rect, Rect)> {
    let monitors = app.available_monitors().ok()?;
    monitors.iter().find_map(|monitor| {
        let scale = monitor.scale_factor();
        let origin = monitor.position().to_logical::<f64>(scale);
        let extent = monitor.size().to_logical::<f64>(scale);
        let screen = Rect { x: origin.x, y: origin.y, width: extent.width, height: extent.height };
        let icon = Rect {
            x: position.x / scale,
            y: position.y / scale,
            width: size.width / scale,
            height: size.height / scale,
        };
        let (cx, cy) = (icon.x + icon.width / 2.0, icon.y + icon.height / 2.0);
        let inside = cx >= screen.x
            && cx <= screen.x + screen.width
            && cy >= screen.y
            && cy <= screen.y + screen.height;
        inside.then_some((icon, screen))
    })
}

/// Glass, unless Reduce Transparency is on; then the page paints it solid.
pub fn backdrop() -> Backdrop {
    if super::reduce_transparency() {
        Backdrop::Solid
    } else {
        Backdrop::Glass
    }
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(LABEL)
}

/// Build the hidden panel at launch.
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("Macro Eleven")
        .inner_size(WIDTH, HEIGHT)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .visible(false)
        .focused(false)
        .shadow(true)
        .skip_taskbar(true)
        .accept_first_mouse(true)
        // The app is dark: the glass and the window chrome must be too
        .theme(Some(tauri::Theme::Dark))
        .initialization_script("window.location.hash = '#/panel';")
        .build()?;

    #[cfg(target_os = "macos")]
    {
        use super::macos;
        use tauri::window::{Effect, EffectState, EffectsBuilder};

        if !macos::liquid_glass_available() {
            let _ = window.set_effects(
                EffectsBuilder::new()
                    .effect(Effect::Menu)
                    .state(EffectState::Active)
                    .radius(CORNER_RADIUS)
                    .build(),
            );
        }
        macos::with_ns_window(&window, macos::make_menu_panel);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window;
    Ok(())
}

/// The icon was pressed: open under it, or close.
pub fn toggle(app: &AppHandle, position: PhysicalPosition<f64>, size: PhysicalSize<f64>) {
    let state = app.state::<PanelState>();
    if state.visible.load(Ordering::SeqCst) {
        hide(app);
        return;
    }
    let just_closed = state
        .hidden_at
        .lock()
        .unwrap()
        .is_some_and(|at| at.elapsed() < REOPEN_GUARD);
    if !just_closed {
        show(app, locate(app, position, size), false);
    }
}

/// Open under the icon with the one-time tip.
pub fn show_tip(app: &AppHandle) {
    let anchor = tray::rect(app).and_then(|(position, size)| locate(app, position, size));
    if anchor.is_some() {
        show(app, anchor, true);
    }
}

fn show(app: &AppHandle, anchor: Option<(Rect, Rect)>, tip: bool) {
    let Some(window) = window(app) else {
        return;
    };
    let state = app.state::<PanelState>();
    state.generation.fetch_add(1, Ordering::SeqCst);
    state.visible.store(true, Ordering::SeqCst);

    let height = state.height.lock().unwrap().unwrap_or(HEIGHT);
    let _ = window.set_size(LogicalSize::new(WIDTH, height));
    if let Some((icon, screen)) = anchor {
        let (x, y) = place(icon, screen, WIDTH);
        let _ = window.set_position(LogicalPosition::new(x, y));
    }
    let backdrop = backdrop();
    let _ = window.emit_to(LABEL, SHOWN, Shown { tip, backdrop });
    tray::set_highlighted(app, true);

    #[cfg(target_os = "macos")]
    super::macos::with_ns_window(&window, move |ns_window| {
        if backdrop == Backdrop::Glass {
            super::macos::set_glass(ns_window, CORNER_RADIUS);
        } else {
            super::macos::remove_glass(ns_window);
        }
        super::macos::present_panel(ns_window);
        super::macos::fade(ns_window, 1.0, FADE_IN_SECONDS, None);
    });
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn hide(app: &AppHandle) {
    let state = app.state::<PanelState>();
    if !state.visible.swap(false, Ordering::SeqCst) {
        return;
    }
    *state.hidden_at.lock().unwrap() = Some(Instant::now());
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    tray::set_highlighted(app, false);
    let Some(window) = window(app) else {
        return;
    };

    #[cfg(target_os = "macos")]
    {
        use objc2::Message;

        let app = app.clone();
        super::macos::with_ns_window(&window, move |ns_window| {
            let panel = ns_window.retain();
            super::macos::fade(
                ns_window,
                0.0,
                FADE_OUT_SECONDS,
                Some(Box::new(move || {
                    // Unless it opened again during the fade
                    if app.state::<PanelState>().generation.load(Ordering::SeqCst) == generation {
                        panel.orderOut(None);
                    }
                })),
            );
        });
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = generation;
        let _ = window.hide();
    }
}

/// The page measured itself. Grows and shrinks downward from the top edge.
pub fn fit(app: &AppHandle, height: f64) {
    let state = app.state::<PanelState>();
    *state.height.lock().unwrap() = Some(height);
    let Some(window) = window(app) else {
        return;
    };
    #[cfg(target_os = "macos")]
    super::macos::with_ns_window(&window, move |ns_window| {
        super::macos::resize_top_anchored(ns_window, WIDTH, height, None);
    });
    #[cfg(not(target_os = "macos"))]
    let _ = window.set_size(LogicalSize::new(WIDTH, height));
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Rect = Rect { x: 0.0, y: 0.0, width: 1512.0, height: 982.0 };

    #[test]
    fn centers_under_the_icon_below_the_menu_bar() {
        let icon = Rect { x: 1000.0, y: 0.0, width: 24.0, height: 24.0 };
        assert_eq!(place(icon, SCREEN, 320.0), (1012.0 - 160.0, 24.0 + GAP));
    }

    #[test]
    fn stays_on_screen_near_the_right_edge() {
        let icon = Rect { x: 1490.0, y: 0.0, width: 20.0, height: 24.0 };
        let (x, _) = place(icon, SCREEN, 320.0);
        assert_eq!(x, 1512.0 - 320.0 - EDGE_MARGIN);
    }

    #[test]
    fn follows_a_second_screen() {
        let screen = Rect { x: 1512.0, y: -200.0, width: 1920.0, height: 1080.0 };
        let icon = Rect { x: 1520.0, y: -200.0, width: 24.0, height: 24.0 };
        let (x, y) = place(icon, screen, 320.0);
        assert_eq!(x, 1512.0 + EDGE_MARGIN);
        assert_eq!(y, -200.0 + 24.0 + GAP);
    }
}
