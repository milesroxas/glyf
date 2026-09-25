//! Installed applications for the app picker: names, bundle IDs, and icons.
//!
//! The list is scanned once and kept in memory. Icons are rendered once to
//! `<app_cache_dir>/icons/<bundleId>.png` and served to the UI through the
//! asset protocol.

mod bundle;
#[cfg(target_os = "macos")]
mod icons;

use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use bundle::Bundle;

/// Icon edge in pixels: sharp at 32 CSS px on a Retina display.
#[cfg(target_os = "macos")]
const ICON_SIZE: u16 = 64;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    pub bundle_id: String,
    pub path: PathBuf,
    /// PNG on disk; the UI turns it into an asset URL.
    pub icon_path: Option<PathBuf>,
}

pub struct AppCatalog {
    icons_dir: PathBuf,
    apps: Mutex<Option<Vec<InstalledApp>>>,
}

/// Folders to scan, with how deep to look in each. CoreServices holds
/// Finder next to many system agents, so only its top level counts.
#[cfg(target_os = "macos")]
fn search_dirs() -> Vec<(PathBuf, usize)> {
    let mut dirs = vec![
        (PathBuf::from("/Applications"), 1),
        (PathBuf::from("/System/Applications"), 1),
        (PathBuf::from("/System/Library/CoreServices"), 0),
    ];
    if let Some(home) = dirs::home_dir() {
        dirs.insert(1, (home.join("Applications"), 1));
    }
    dirs
}

#[cfg(not(target_os = "macos"))]
fn search_dirs() -> Vec<(PathBuf, usize)> {
    Vec::new()
}

impl AppCatalog {
    pub fn new(cache_dir: PathBuf) -> Self {
        Self {
            icons_dir: cache_dir.join("icons"),
            apps: Mutex::new(None),
        }
    }

    /// Installed apps sorted by name. `refresh` rescans the disk.
    pub fn list(&self, refresh: bool) -> Vec<InstalledApp> {
        let mut apps = self.apps.lock().unwrap_or_else(|p| p.into_inner());
        if refresh || apps.is_none() {
            *apps = Some(self.scan());
        }
        apps.clone().unwrap_or_default()
    }

    /// Describe an app the user picked with the file dialog.
    pub fn describe(&self, path: &Path) -> Result<InstalledApp, String> {
        bundle::read_bundle(path)
            .map(|bundle| self.entry(bundle))
            .ok_or_else(|| format!("{} is not an app", path.display()))
    }

    fn scan(&self) -> Vec<InstalledApp> {
        let mut bundles = Vec::new();
        for (dir, depth) in search_dirs() {
            let mut found = Vec::new();
            bundle::find_bundles(&dir, depth, &mut found);
            let top_level_only = depth == 0;
            bundles.extend(
                found
                    .into_iter()
                    .filter(|bundle| !(top_level_only && bundle.background)),
            );
        }
        // The first copy of a bundle ID wins (user folders before system ones)
        let mut seen = HashSet::new();
        bundles.retain(|bundle| seen.insert(bundle.bundle_id.clone()));
        bundles.sort_by_key(|bundle| bundle.name.to_lowercase());
        bundles.into_iter().map(|bundle| self.entry(bundle)).collect()
    }

    fn entry(&self, bundle: Bundle) -> InstalledApp {
        InstalledApp {
            icon_path: self.icon(&bundle),
            name: bundle.name,
            bundle_id: bundle.bundle_id,
            path: bundle.path,
        }
    }

    #[cfg(target_os = "macos")]
    fn icon(&self, bundle: &Bundle) -> Option<PathBuf> {
        let file = self.icons_dir.join(icon_file_name(&bundle.bundle_id));
        if !file.exists() {
            let png = icons::render_png(&bundle.path, ICON_SIZE)?;
            crate::config::storage::write_atomic(&file, &png).ok()?;
        }
        Some(file)
    }

    #[cfg(not(target_os = "macos"))]
    fn icon(&self, _bundle: &Bundle) -> Option<PathBuf> {
        None
    }
}

/// A bundle ID comes from the bundle's own Info.plist, so keep only
/// characters that cannot leave the icons folder.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn icon_file_name(bundle_id: &str) -> String {
    let safe: String = bundle_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .collect();
    format!("{safe}.png")
}

#[cfg(test)]
mod name_tests {
    use super::icon_file_name;

    #[test]
    fn icon_names_stay_in_the_folder() {
        assert_eq!(icon_file_name("com.apple.Notes"), "com.apple.Notes.png");
        assert_eq!(icon_file_name("../../evil"), ".._.._evil.png");
        assert!(!icon_file_name("a/b\\c").contains(['/', '\\']));
    }
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn lists_system_apps_with_icons_and_caches_the_list() {
        let cache = tempfile::tempdir().unwrap();
        let catalog = AppCatalog::new(cache.path().to_owned());
        let apps = catalog.list(false);
        for id in ["com.apple.finder", "com.apple.Safari"] {
            let app = apps
                .iter()
                .find(|app| app.bundle_id == id)
                .unwrap_or_else(|| panic!("{id} not found"));
            assert!(app.icon_path.as_ref().is_some_and(|p| p.exists()), "{id} icon");
        }

        let start = Instant::now();
        assert_eq!(catalog.list(false).len(), apps.len());
        assert!(start.elapsed().as_millis() < 5, "{:?}", start.elapsed());
    }

    #[test]
    fn describes_a_picked_app() {
        let cache = tempfile::tempdir().unwrap();
        let catalog = AppCatalog::new(cache.path().to_owned());
        let dir = tempfile::tempdir().unwrap();
        let app = bundle::tests::fake_app(
            dir.path(),
            "Fixture",
            "<key>CFBundleIdentifier</key><string>com.example.fixture</string>",
        );
        let described = catalog.describe(&app).unwrap();
        assert_eq!(described.name, "Fixture");
        assert_eq!(described.bundle_id, "com.example.fixture");
        assert!(catalog.describe(dir.path()).is_err());
    }
}
