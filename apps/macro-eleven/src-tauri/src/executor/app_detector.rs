/// Detect the active application on macOS
///
/// Returns the application name of the frontmost app

#[cfg(target_os = "macos")]
pub fn get_active_app() -> Option<String> {
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSAutoreleasePool, NSString};
    use objc::runtime::Class;
    use objc::*;

    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace_class = Class::get("NSWorkspace")?;
        let workspace: id = msg_send![workspace_class, sharedWorkspace];
        let app: id = msg_send![workspace, frontmostApplication];

        if app == nil {
            return None;
        }

        let name: id = msg_send![app, localizedName];
        if name == nil {
            return None;
        }

        let name_str = NSString::UTF8String(name);
        if name_str.is_null() {
            return None;
        }

        let c_str = std::ffi::CStr::from_ptr(name_str);
        c_str.to_str().ok().map(|s| s.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_app() -> Option<String> {
    // Placeholder for other platforms
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "macos")]
    fn test_get_active_app() {
        // Should return Some app name (at least the test runner)
        let app = get_active_app();
        assert!(app.is_some());
        println!("Active app: {:?}", app);
    }
}
