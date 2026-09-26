//! AppKit pieces Tauri does not expose: Liquid Glass, window fades, the menu
//! bar panel's NSPanel behavior, top-anchored resizes, the status item's
//! highlight, the login item, and how the app was launched.
//!
//! Everything that touches a window takes the `NSWindow` and must run on the
//! main thread; `with_ns_window` gets there from a Tauri window.

use std::cell::Cell;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject};
use objc2::{define_class, msg_send, ClassType, MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{
    NSAnimatablePropertyContainer, NSAnimationContext, NSAutoresizingMaskOptions,
    NSGlassEffectView, NSGlassEffectViewStyle, NSPanel, NSPopUpMenuWindowLevel, NSStatusItem,
    NSTitlebarSeparatorStyle, NSUserInterfaceItemIdentification, NSView, NSWindow,
    NSWindowAnimationBehavior, NSWindowButton, NSWindowCollectionBehavior, NSWindowOrderingMode,
    NSWindowStyleMask, NSWorkspace,
};
use objc2_foundation::{NSAppleEventDescriptor, NSAppleEventManager, NSPoint, NSRect, NSSize, NSString};
use objc2_quartz_core::CAMediaTimingFunction;
use objc2_service_management::{SMAppService, SMAppServiceStatus};
use tauri::{Runtime, WebviewWindow};

use super::LoginItemStatus;

/// Run `f` with the window's `NSWindow` on the main thread.
pub fn with_ns_window<R: Runtime>(
    window: &WebviewWindow<R>,
    f: impl FnOnce(&NSWindow) + Send + 'static,
) {
    let target = window.clone();
    let _ = window.run_on_main_thread(move || {
        if let Ok(ptr) = target.ns_window() {
            // SAFETY: Tauri owns the window for as long as `target` lives,
            // and this closure runs on the main thread.
            f(unsafe { &*(ptr as *const NSWindow) });
        }
    });
}

// ── Liquid Glass ───────────────────────────────────────────────────────────

const GLASS_ID: &str = "macro11.glass";

/// `NSGlassEffectView` ships with macOS 26.
pub fn liquid_glass_available() -> bool {
    AnyClass::get(c"NSGlassEffectView").is_some()
}

fn glass_view(window: &NSWindow) -> Option<Retained<NSView>> {
    let content = window.contentView()?;
    let id = NSString::from_str(GLASS_ID);
    content
        .subviews()
        .iter()
        .find(|view| view.identifier().is_some_and(|found| found.isEqualToString(&id)))
}

/// Put Liquid Glass behind the webview, filling the window with its corners
/// at `corner_radius`. Returns false where macOS has no Liquid Glass; the
/// caller falls back to vibrancy.
pub fn set_glass(window: &NSWindow, corner_radius: f64) -> bool {
    let Some(mtm) = MainThreadMarker::new() else {
        return false;
    };
    if !liquid_glass_available() {
        return false;
    }
    let Some(content) = window.contentView() else {
        return false;
    };
    if let Some(existing) = glass_view(window) {
        if let Some(glass) = existing.downcast_ref::<NSGlassEffectView>() {
            glass.setCornerRadius(corner_radius);
        }
        return true;
    }
    let glass = NSGlassEffectView::initWithFrame(NSGlassEffectView::alloc(mtm), content.bounds());
    glass.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewHeightSizable,
    );
    glass.setStyle(NSGlassEffectViewStyle::Regular);
    glass.setCornerRadius(corner_radius);
    glass.setIdentifier(Some(&NSString::from_str(GLASS_ID)));
    content.addSubview_positioned_relativeTo(&glass, NSWindowOrderingMode::Below, None);
    window.invalidateShadow();
    true
}

pub fn remove_glass(window: &NSWindow) {
    if let Some(glass) = glass_view(window) {
        glass.removeFromSuperview();
        window.invalidateShadow();
    }
}

/// System Settings › Accessibility › Display › Reduce transparency.
pub fn reduce_transparency() -> bool {
    NSWorkspace::sharedWorkspace().accessibilityDisplayShouldReduceTransparency()
}

// ── Motion ─────────────────────────────────────────────────────────────────

/// Strong ease-out, the same curve as `--ease-out` in App.css.
fn ease_out() -> Retained<CAMediaTimingFunction> {
    CAMediaTimingFunction::functionWithControlPoints(0.23, 1.0, 0.32, 1.0)
}

/// Animate the window's opacity, shadow included, on the compositor. `done`
/// runs when the fade finishes.
pub fn fade(window: &NSWindow, alpha: f64, seconds: f64, done: Option<Box<dyn FnOnce()>>) {
    NSAnimationContext::beginGrouping();
    let context = NSAnimationContext::currentContext();
    context.setDuration(seconds);
    context.setTimingFunction(Some(&ease_out()));
    let completion = done.map(|done| {
        let done = Cell::new(Some(done));
        RcBlock::new(move || {
            if let Some(done) = done.take() {
                done();
            }
        })
    });
    if let Some(completion) = &completion {
        context.setCompletionHandler(Some(&**completion));
    }
    window.animator().setAlphaValue(alpha);
    NSAnimationContext::endGrouping();
}

/// Resize the content to `width` × `height` points with the top edge held
/// still, as macOS Settings windows do between panes. Animated when
/// `seconds` is given.
pub fn resize_top_anchored(window: &NSWindow, width: f64, height: f64, seconds: Option<f64>) {
    move_and_resize(window, (0.0, 0.0), width, height, seconds);
}

/// Move the window's top-left corner by `offset` points (y down, as Tauri
/// counts) and size its content to `width` × `height`. Animated when
/// `seconds` is given.
pub fn move_and_resize(
    window: &NSWindow,
    (dx, dy): (f64, f64),
    width: f64,
    height: f64,
    seconds: Option<f64>,
) {
    let frame = window.frame();
    let content = window.contentRectForFrameRect(frame);
    let size = NSSize::new(
        width + (frame.size.width - content.size.width),
        height + (frame.size.height - content.size.height),
    );
    // AppKit's y runs up from the bottom of the screen
    let top = frame.origin.y + frame.size.height - dy;
    let next = NSRect::new(NSPoint::new(frame.origin.x + dx, top - size.height), size);
    if dx.abs() < 0.5
        && dy.abs() < 0.5
        && (next.size.height - frame.size.height).abs() < 0.5
        && (next.size.width - frame.size.width).abs() < 0.5
    {
        return;
    }
    match seconds {
        Some(seconds) => {
            NSAnimationContext::beginGrouping();
            let context = NSAnimationContext::currentContext();
            context.setDuration(seconds);
            context.setTimingFunction(Some(&ease_out()));
            window.animator().setFrame_display(next, true);
            NSAnimationContext::endGrouping();
        }
        None => window.setFrame_display(next, true),
    }
}

/// Utility windows fade in and out the way panels do.
pub fn use_utility_window_animation(window: &NSWindow) {
    window.setAnimationBehavior(NSWindowAnimationBehavior::UtilityWindow);
}

// ── The menu bar panel ─────────────────────────────────────────────────────

define_class!(
    // SAFETY: NSPanel may be subclassed; the overrides match AppKit's
    // signatures and need no ivars, so an existing window can take the class.
    #[unsafe(super(NSPanel, NSWindow))]
    #[thread_kind = MainThreadOnly]
    #[name = "MacroElevenMenuPanel"]
    struct MenuPanel;

    impl MenuPanel {
        /// Borderless windows refuse key status by default; the panel needs
        /// it for the keyboard and to close when it loses focus.
        #[unsafe(method(canBecomeKeyWindow))]
        fn can_become_key_window(&self) -> bool {
            true
        }

        #[unsafe(method(canBecomeMainWindow))]
        fn can_become_main_window(&self) -> bool {
            false
        }
    }
);

/// Turn a Tauri window into a non-activating panel: it takes the keyboard
/// without bringing Macro Eleven's other windows forward, floats above other
/// apps (full-screen ones included), and stays out of ⌘-Tab and Mission
/// Control, like a menu. A titled window (macOS 26, for its rounded shape)
/// loses its title bar: no buttons, no separator, and no dragging by it.
pub fn make_menu_panel(window: &NSWindow) {
    // SAFETY: MenuPanel adds no ivars to NSPanel, and NSPanel adds none to
    // NSWindow that an existing window lacks; the tauri-nspanel crate relies
    // on the same swap. Tao's window class only adds overrides MenuPanel
    // replaces and a `focusable` flag this app never changes on the panel.
    unsafe {
        let object = &*(window as *const NSWindow as *const AnyObject);
        AnyObject::set_class(object, MenuPanel::class());
    }
    // SAFETY: the object is now a MenuPanel, a subclass of NSPanel.
    let panel = unsafe { &*(window as *const NSWindow as *const NSPanel) };
    panel.setStyleMask(panel.styleMask() | NSWindowStyleMask::NonactivatingPanel);
    panel.setFloatingPanel(true);
    panel.setBecomesKeyOnlyIfNeeded(false);
    panel.setWorksWhenModal(true);
    panel.setHidesOnDeactivate(false);
    panel.setLevel(NSPopUpMenuWindowLevel);
    panel.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Transient
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    // The panel fades itself (`fade`), so AppKit's own animation stays off
    panel.setAnimationBehavior(NSWindowAnimationBehavior::None);
    panel.setHasShadow(true);
    // Only a titled window has these
    for button in [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ] {
        if let Some(button) = panel.standardWindowButton(button) {
            button.setHidden(true);
        }
    }
    panel.setTitlebarSeparatorStyle(NSTitlebarSeparatorStyle::None);
    panel.setMovable(false);
}

/// Show the panel with the keyboard, without activating the app.
pub fn present_panel(window: &NSWindow) {
    window.setAlphaValue(0.0);
    window.orderFrontRegardless();
    window.makeKeyWindow();
}

/// The menu bar icon stays pressed while its panel is open, as it does for
/// a menu.
pub fn set_status_item_highlighted(item: &NSStatusItem, highlighted: bool) {
    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };
    if let Some(button) = item.button(mtm) {
        button.highlight(highlighted);
    }
}

// ── Launch ─────────────────────────────────────────────────────────────────

/// Whether macOS opened the app as a login item. Read it during launch,
/// while the open-application event is current.
pub fn launched_at_login() -> bool {
    const OPEN_APPLICATION: u32 = u32::from_be_bytes(*b"oapp");
    const PROPERTY_DATA: u32 = u32::from_be_bytes(*b"prdt");
    const LAUNCHED_AS_LOGIN_ITEM: u32 = u32::from_be_bytes(*b"lgit");

    let Some(event) = NSAppleEventManager::sharedAppleEventManager().currentAppleEvent() else {
        return false;
    };
    // SAFETY: `eventID` and `paramDescriptorForKeyword:` take and return
    // FourCharCodes (UInt32); the descriptor is an NSAppleEventDescriptor.
    let id: u32 = unsafe { msg_send![&event, eventID] };
    let property: Option<Retained<NSAppleEventDescriptor>> =
        unsafe { msg_send![&event, paramDescriptorForKeyword: PROPERTY_DATA] };
    id == OPEN_APPLICATION
        && property.is_some_and(|property| property.enumCodeValue() == LAUNCHED_AS_LOGIN_ITEM)
}

// ── Open at Login ──────────────────────────────────────────────────────────

pub fn login_item_status() -> LoginItemStatus {
    // SAFETY: SMAppService is thread-safe; `mainAppService` is this app.
    let status = unsafe { SMAppService::mainAppService().status() };
    match status {
        SMAppServiceStatus::Enabled => LoginItemStatus::Enabled,
        SMAppServiceStatus::RequiresApproval => LoginItemStatus::RequiresApproval,
        SMAppServiceStatus::NotFound => LoginItemStatus::Unavailable,
        _ => LoginItemStatus::Disabled,
    }
}

pub fn set_login_item(enabled: bool) -> Result<LoginItemStatus, String> {
    // SAFETY: as above.
    let service = unsafe { SMAppService::mainAppService() };
    let result = if enabled {
        unsafe { service.registerAndReturnError() }
    } else {
        unsafe { service.unregisterAndReturnError() }
    };
    result.map_err(|error| error.localizedDescription().to_string())?;
    Ok(login_item_status())
}

/// System Settings › General › Login Items.
pub fn open_login_items_settings() {
    // SAFETY: a class method with no arguments.
    unsafe { SMAppService::openSystemSettingsLoginItems() };
}
