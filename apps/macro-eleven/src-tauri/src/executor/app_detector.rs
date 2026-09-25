use crate::config::keymap::FrontApp;

/// The frontmost application, or None when it cannot be read.
#[cfg(target_os = "macos")]
pub fn front_app() -> Option<FrontApp> {
    use objc2::rc::autoreleasepool;
    use objc2_app_kit::NSWorkspace;

    // Runs on a background thread, which has no autorelease pool of its own
    autoreleasepool(|_| {
        let app = NSWorkspace::sharedWorkspace().frontmostApplication()?;
        Some(FrontApp {
            name: app.localizedName()?.to_string(),
            bundle_id: app.bundleIdentifier().map(|id| id.to_string()),
        })
    })
}

#[cfg(not(target_os = "macos"))]
pub fn front_app() -> Option<FrontApp> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    #[ignore = "needs a GUI session"]
    fn reads_the_front_app() {
        assert!(front_app().is_some());
    }
}
