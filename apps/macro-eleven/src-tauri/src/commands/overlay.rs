use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const OVERLAY_LABEL: &str = "macro11-overlay";
// The pad fills the window below the title bar (28 px) with a 12 px margin
// at the sides and bottom and 2 px at the top. The grid is 4.3 keys wide and
// 3.2 keys tall (OverlayView.tsx), so a 72 px key needs 334 × 273 and a
// 60 px key, the smallest that keeps an eight-letter label on one line,
// needs 282 × 234.
const OVERLAY_WIDTH: f64 = 336.0;
const OVERLAY_HEIGHT: f64 = 274.0;
const OVERLAY_MIN_WIDTH: f64 = 282.0;
const OVERLAY_MIN_HEIGHT: f64 = 234.0;

/// Opens the compact overlay window. If already open, focuses it.
#[tauri::command]
pub async fn open_overlay_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = window.set_focus();
        return Ok(());
    }

    let url = WebviewUrl::App("index.html".into());
    let init_script = "window.location.hash = '#/overlay';";

    let builder = WebviewWindowBuilder::new(&app, OVERLAY_LABEL, url)
        .title("Macro Eleven Overlay")
        .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
        .resizable(true)
        .min_inner_size(OVERLAY_MIN_WIDTH, OVERLAY_MIN_HEIGHT)
        .decorations(true)
        .always_on_top(true)
        // The chassis color (--card), so the window never flashes white
        .background_color(tauri::window::Color(23, 23, 23, 255))
        .initialization_script(init_script);

    // The window is the pad's chassis: content runs under a hidden title
    // bar, with the window buttons over it
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    builder.build().map_err(|e| e.to_string())?;

    Ok(())
}
