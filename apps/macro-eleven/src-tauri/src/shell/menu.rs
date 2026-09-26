//! The app menu (Macro Eleven › Settings… ⌘,) and the menu bar icon's
//! right-click menu share these item IDs and one handler.

use tauri::menu::{Menu, MenuEvent, MenuItem, MenuItemKind};
use tauri::{AppHandle, Runtime};

use super::windows;

pub const OPEN: &str = "macro11.open";
pub const SETTINGS: &str = "macro11.settings";
pub const QUIT: &str = "macro11.quit";

/// Tauri's standard macOS menu with Settings… after About, where Mac apps
/// keep it.
pub fn app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let menu = Menu::default(app)?;
    #[cfg(target_os = "macos")]
    if let Some(MenuItemKind::Submenu(app_submenu)) = menu.items()?.into_iter().next() {
        let settings = MenuItem::with_id(app, SETTINGS, "Settings…", true, Some("CmdOrCtrl+,"))?;
        // After "About Macro Eleven" and its separator
        app_submenu.insert(&settings, 2)?;
        app_submenu.insert(&tauri::menu::PredefinedMenuItem::separator(app)?, 3)?;
    }
    Ok(menu)
}

pub fn handle(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        OPEN => windows::show_main(app, None),
        SETTINGS => windows::show_settings(app),
        QUIT => app.exit(0),
        _ => {}
    }
}
