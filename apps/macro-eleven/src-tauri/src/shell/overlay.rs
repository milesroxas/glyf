//! The overlay: a small always-on-top window drawn as the pad. Its settings
//! (visible, on top, all Spaces, glass or solid) apply as soon as they
//! change, and it comes back where the user left it.

use std::sync::Mutex;

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

use super::Backdrop;
use crate::config::settings::{Frame, OverlayMaterial, Settings, SettingsStore};

pub const LABEL: &str = "macro11-overlay";

// The pad fills the window below the title bar (28 px) with a 12 px margin
// at the sides and bottom and 2 px at the top. The grid is 4.3 keys wide and
// 3.2 keys tall (OverlayView.tsx), so a 72 px key needs 334 × 273 and a
// 60 px key, the smallest that keeps an eight-letter label on one line,
// needs 282 × 234.
const WIDTH: f64 = 336.0;
const HEIGHT: f64 = 274.0;
const MIN_WIDTH: f64 = 282.0;
const MIN_HEIGHT: f64 = 234.0;
/// A new overlay sits this far in from the screen's bottom-right corner.
const MARGIN: f64 = 24.0;
/// The corners of a macOS 26 window without a toolbar, which the glass
/// follows.
#[cfg(target_os = "macos")]
const CORNER_RADIUS: f64 = 16.0;

/// Idle, the overlay fades to this opacity: out slowly, back at once.
#[cfg(target_os = "macos")]
const DIMMED_ALPHA: f64 = 0.35;
#[cfg(target_os = "macos")]
const DIM_SECONDS: f64 = 0.6;
#[cfg(target_os = "macos")]
const UNDIM_SECONDS: f64 = 0.12;
/// Reset Position and Size glides the overlay home this fast.
#[cfg(target_os = "macos")]
const RESET_SECONDS: f64 = 0.35;

/// What the overlay draws behind its keys, after Reduce Transparency.
pub const MATERIAL_CHANGED: &str = "macro11:overlay-material";

/// The overlay's frame while it moves, saved when it hides or the app quits.
#[derive(Default)]
pub struct OverlayFrame(Mutex<Option<Frame>>);

fn backdrop_for(material: OverlayMaterial) -> Backdrop {
    if material == OverlayMaterial::Glass && !super::reduce_transparency() {
        Backdrop::Glass
    } else {
        Backdrop::Solid
    }
}

/// The backdrop the overlay page should draw now.
pub fn backdrop(app: &AppHandle) -> Backdrop {
    backdrop_for(app.state::<SettingsStore>().get().overlay_material)
}

/// Liquid Glass on macOS 26, HUD vibrancy before it, the chassis color when
/// solid. The page learns which, so its tint matches.
fn apply_material(window: &WebviewWindow, material: OverlayMaterial) {
    let backdrop = backdrop_for(material);
    #[cfg(target_os = "macos")]
    {
        use super::macos;
        use tauri::window::{Effect, EffectState, EffectsBuilder};

        let glass = backdrop == Backdrop::Glass;
        let liquid = glass && macos::liquid_glass_available();
        let vibrancy = glass && !liquid;
        let _ = window.set_effects(vibrancy.then(|| {
            EffectsBuilder::new()
                .effect(Effect::HudWindow)
                .state(EffectState::Active)
                .build()
        }));
        macos::with_ns_window(window, move |ns_window| {
            if liquid {
                macos::set_glass(ns_window, CORNER_RADIUS);
            } else {
                macos::remove_glass(ns_window);
            }
        });
    }
    let _ = window.emit_to(LABEL, MATERIAL_CHANGED, backdrop);
}

/// A saved frame, if it is still on a screen.
fn restorable(app: &AppHandle, frame: Option<Frame>) -> Option<Frame> {
    let frame = frame?;
    let monitors = app.available_monitors().ok()?;
    let (cx, cy) = (frame.x + frame.width / 2.0, frame.y + frame.height / 2.0);
    monitors
        .iter()
        .any(|monitor| {
            let scale = monitor.scale_factor();
            let position = monitor.position().to_logical::<f64>(scale);
            let size = monitor.size().to_logical::<f64>(scale);
            cx >= position.x
                && cx <= position.x + size.width
                && cy >= position.y
                && cy <= position.y + size.height
        })
        .then_some(frame)
}

/// Bottom right of the main screen's usable area.
fn default_position(app: &AppHandle) -> Option<LogicalPosition<f64>> {
    let monitor = app.primary_monitor().ok()??;
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let position = area.position.to_logical::<f64>(scale);
    let size = area.size.to_logical::<f64>(scale);
    Some(LogicalPosition::new(
        position.x + size.width - WIDTH - MARGIN,
        position.y + size.height - HEIGHT - MARGIN,
    ))
}

fn create(app: &AppHandle, settings: &Settings) -> tauri::Result<WebviewWindow> {
    let saved = restorable(app, app.state::<SettingsStore>().window_state().overlay_frame);
    let mut builder = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("Macro Eleven Overlay")
        .inner_size(WIDTH, HEIGHT)
        .min_inner_size(MIN_WIDTH, MIN_HEIGHT)
        .resizable(true)
        .decorations(true)
        .transparent(true)
        .visible(false)
        .focused(false)
        .always_on_top(settings.overlay_on_top)
        .visible_on_all_workspaces(settings.overlay_all_spaces)
        .theme(Some(tauri::Theme::Dark))
        .initialization_script("window.location.hash = '#/overlay';");
    if let Some(frame) = saved {
        builder = builder
            .position(frame.x, frame.y)
            .inner_size(frame.width, frame.height);
    } else if let Some(position) = default_position(app) {
        builder = builder.position(position.x, position.y);
    }
    // The window is the pad's chassis: content runs under a hidden title
    // bar, with the window buttons over it
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    let window = builder.build()?;
    apply_material(&window, settings.overlay_material);
    #[cfg(target_os = "macos")]
    super::macos::with_ns_window(&window, super::macos::use_utility_window_animation);
    Ok(window)
}

fn show(app: &AppHandle, settings: &Settings) {
    let window = match app.get_webview_window(LABEL) {
        Some(window) => window,
        None => match create(app, settings) {
            Ok(window) => window,
            Err(e) => {
                eprintln!("Could not open the overlay: {e}");
                return;
            }
        },
    };
    // Over the app in front without taking the keyboard from it (or from
    // the panel, which would close), and never still faded from last time
    #[cfg(target_os = "macos")]
    super::macos::with_ns_window(&window, |ns_window| {
        ns_window.setAlphaValue(1.0);
        ns_window.orderFrontRegardless();
    });
    #[cfg(not(target_os = "macos"))]
    let _ = window.show();
}

/// Fade while the pad is idle; come back when it is used or pointed at.
pub fn set_dimmed(app: &AppHandle, dimmed: bool) {
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    #[cfg(target_os = "macos")]
    super::macos::with_ns_window(&window, move |ns_window| {
        let (alpha, seconds) = if dimmed {
            (DIMMED_ALPHA, DIM_SECONDS)
        } else {
            (1.0, UNDIM_SECONDS)
        };
        super::macos::fade(ns_window, alpha, seconds, None);
    });
    #[cfg(not(target_os = "macos"))]
    let _ = (window, dimmed);
}

fn hide(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.hide();
    }
    save_frame(app);
}

/// Make the overlay match `next`.
pub fn apply(app: &AppHandle, before: Option<&Settings>, next: &Settings) {
    let changed = |field: fn(&Settings) -> bool| before.is_none_or(|b| field(b) != field(next));
    if changed(|s| s.overlay_visible) {
        if next.overlay_visible {
            show(app, next);
        } else {
            hide(app);
        }
    }
    // A window created above already has these
    let Some(before) = before else {
        return;
    };
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    if before.overlay_on_top != next.overlay_on_top {
        let _ = window.set_always_on_top(next.overlay_on_top);
    }
    if before.overlay_all_spaces != next.overlay_all_spaces {
        let _ = window.set_visible_on_all_workspaces(next.overlay_all_spaces);
    }
    if before.overlay_material != next.overlay_material {
        apply_material(&window, next.overlay_material);
    }
}

/// Check Reduce Transparency again (the overlay page saw it change).
pub fn refresh_material(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        apply_material(&window, app.state::<SettingsStore>().get().overlay_material);
    }
}

/// Remember where the overlay is (it moved or resized).
pub fn track_frame(window: &WebviewWindow) {
    let (Ok(position), Ok(size), Ok(scale)) =
        (window.outer_position(), window.inner_size(), window.scale_factor())
    else {
        return;
    };
    let position: LogicalPosition<f64> = position.to_logical(scale);
    let size: LogicalSize<f64> = size.to_logical(scale);
    let frame = Frame {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    };
    *window.state::<OverlayFrame>().0.lock().unwrap() = Some(frame);
}

/// Save the frame from `track_frame`, once, instead of on every move.
pub fn save_frame(app: &AppHandle) {
    let frame = app.state::<OverlayFrame>().0.lock().unwrap().take();
    if let Some(frame) = frame {
        app.state::<SettingsStore>()
            .update_window_state(|state| state.overlay_frame = Some(frame));
    }
}

/// Forget where the user put the overlay: back to its first size at the
/// bottom right of the main screen, gliding there if it is open.
pub fn reset_frame(app: &AppHandle) {
    app.state::<OverlayFrame>().0.lock().unwrap().take();
    app.state::<SettingsStore>()
        .update_window_state(|state| state.overlay_frame = None);
    let (Some(window), Some(target)) = (app.get_webview_window(LABEL), default_position(app))
    else {
        return;
    };
    #[cfg(target_os = "macos")]
    {
        let (Ok(position), Ok(scale)) = (window.outer_position(), window.scale_factor()) else {
            return;
        };
        let position: LogicalPosition<f64> = position.to_logical(scale);
        let offset = (target.x - position.x, target.y - position.y);
        let seconds = window.is_visible().unwrap_or(false).then_some(RESET_SECONDS);
        super::macos::with_ns_window(&window, move |ns_window| {
            super::macos::move_and_resize(ns_window, offset, WIDTH, HEIGHT, seconds);
        });
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.set_size(LogicalSize::new(WIDTH, HEIGHT));
        let _ = window.set_position(target);
    }
}

/// Show or hide the overlay, and remember it for the next launch.
pub fn set_visible(app: &AppHandle, visible: bool) -> Result<Settings, String> {
    let mut patch = serde_json::Map::new();
    patch.insert("overlayVisible".into(), visible.into());
    super::update_settings(app, &patch)
}

/// The overlay shortcut and the panel's switch.
pub fn toggle(app: &AppHandle) {
    let visible = app.state::<SettingsStore>().get().overlay_visible;
    if let Err(e) = set_visible(app, !visible) {
        eprintln!("{e}");
    }
}
