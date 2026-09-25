//! Reading `.app` bundles.

use std::fs;
use std::path::{Path, PathBuf};

/// An application bundle, as the app picker shows it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Bundle {
    /// The name Finder and Spotlight show (the bundle's file name), which is
    /// also what `open -a` accepts.
    pub name: String,
    pub bundle_id: String,
    pub path: PathBuf,
    /// Menu-bar or background-only app (`LSUIElement` / `LSBackgroundOnly`).
    pub background: bool,
}

fn is_app(path: &Path) -> bool {
    path.extension().is_some_and(|ext| ext == "app")
}

fn flag(dict: &plist::Dictionary, key: &str) -> bool {
    match dict.get(key) {
        Some(plist::Value::Boolean(value)) => *value,
        Some(plist::Value::String(value)) => value == "1" || value.eq_ignore_ascii_case("yes"),
        Some(plist::Value::Integer(value)) => value.as_signed() == Some(1),
        _ => false,
    }
}

/// Read a bundle's `Info.plist`. None when it is not an app with a bundle ID.
pub fn read_bundle(path: &Path) -> Option<Bundle> {
    if !is_app(path) {
        return None;
    }
    let info = plist::Value::from_file(path.join("Contents").join("Info.plist")).ok()?;
    let dict = info.as_dictionary()?;
    let bundle_id = dict.get("CFBundleIdentifier")?.as_string()?.trim().to_owned();
    if bundle_id.is_empty() {
        return None;
    }
    let name = path.file_stem()?.to_str()?.to_owned();
    Some(Bundle {
        name,
        bundle_id,
        path: path.to_owned(),
        background: flag(dict, "LSUIElement") || flag(dict, "LSBackgroundOnly"),
    })
}

/// `.app` bundles in `dir`, looking `depth` folders deep (not inside apps).
pub fn find_bundles(dir: &Path, depth: usize, found: &mut Vec<Bundle>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let hidden = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_none_or(|n| n.starts_with('.'));
        if hidden {
            continue;
        }
        if is_app(&path) {
            found.extend(read_bundle(&path));
        } else if depth > 0 && path.is_dir() {
            find_bundles(&path, depth - 1, found);
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    /// Write a minimal app bundle and return its path.
    pub fn fake_app(dir: &Path, name: &str, plist_body: &str) -> PathBuf {
        let app = dir.join(format!("{name}.app"));
        let contents = app.join("Contents");
        fs::create_dir_all(&contents).unwrap();
        fs::write(
            contents.join("Info.plist"),
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>{plist_body}</dict></plist>"#
            ),
        )
        .unwrap();
        app
    }

    #[test]
    fn reads_name_bundle_id_and_background_flag() {
        let dir = tempfile::tempdir().unwrap();
        let app = fake_app(
            dir.path(),
            "Google Chrome",
            "<key>CFBundleIdentifier</key><string>com.google.Chrome</string>\
             <key>CFBundleName</key><string>Chrome</string>",
        );
        assert_eq!(
            read_bundle(&app),
            Some(Bundle {
                name: "Google Chrome".into(),
                bundle_id: "com.google.Chrome".into(),
                path: app.clone(),
                background: false,
            })
        );

        let agent = fake_app(
            dir.path(),
            "Agent",
            "<key>CFBundleIdentifier</key><string>com.example.agent</string>\
             <key>LSUIElement</key><string>1</string>",
        );
        assert!(read_bundle(&agent).unwrap().background);
    }

    #[test]
    fn skips_bundles_without_an_id() {
        let dir = tempfile::tempdir().unwrap();
        let app = fake_app(dir.path(), "Broken", "<key>CFBundleName</key><string>x</string>");
        assert_eq!(read_bundle(&app), None);
        assert_eq!(read_bundle(dir.path()), None, "not an .app");
    }

    #[test]
    fn finds_apps_in_subfolders_but_not_inside_apps() {
        let dir = tempfile::tempdir().unwrap();
        let id = |id: &str| format!("<key>CFBundleIdentifier</key><string>{id}</string>");
        let outer = fake_app(dir.path(), "Outer", &id("com.example.outer"));
        fake_app(&outer.join("Contents"), "Helper", &id("com.example.helper"));
        let suite = dir.path().join("Suite");
        fs::create_dir(&suite).unwrap();
        fake_app(&suite, "Inner", &id("com.example.inner"));

        let mut found = Vec::new();
        find_bundles(dir.path(), 1, &mut found);
        let mut names: Vec<_> = found.into_iter().map(|b| b.name).collect();
        names.sort();
        assert_eq!(names, ["Inner", "Outer"]);
    }
}
