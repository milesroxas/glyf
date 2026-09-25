use std::path::PathBuf;
use tauri::State;

use crate::apps::{AppCatalog, InstalledApp};

/// Installed apps for the picker. The first call scans the disk and renders
/// icons; later calls return the cached list unless `refresh` is set.
#[tauri::command(async)]
pub fn list_installed_apps(refresh: bool, catalog: State<'_, AppCatalog>) -> Vec<InstalledApp> {
    catalog.list(refresh)
}

/// An app chosen with the "Other…" file dialog.
#[tauri::command(async)]
pub fn describe_app(path: PathBuf, catalog: State<'_, AppCatalog>) -> Result<InstalledApp, String> {
    catalog.describe(&path)
}
