/// Detect the active application on macOS
///
/// Returns the application name of the frontmost app
#[cfg(target_os = "macos")]
pub fn get_active_app() -> Option<String> {
    use objc2_app_kit::NSWorkspace;

    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    Some(app.localizedName()?.to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_app() -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    fn test_get_active_app() {
        let app = get_active_app();
        assert!(app.is_some());
        println!("Active app: {:?}", app);
    }
}
