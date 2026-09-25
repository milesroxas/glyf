//! Keymap profiles. Saving or switching the active profile reloads the
//! engine at once, so the pad follows every edit without a restart.

use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;

use crate::config::keymap::Keymap;
use crate::config::profiles::{ProfileList, ProfileStore};
use crate::engine::events::KEYMAP_CHANGED;
use crate::engine::KeymapEngine;

type Engine<'a> = State<'a, Arc<KeymapEngine>>;
type Store<'a> = State<'a, ProfileStore>;

#[derive(Clone, Serialize)]
struct KeymapChanged<'a> {
    profile: &'a str,
    /// Label of the window that made the change, so it can skip reloading.
    source: Option<&'a str>,
}

fn announce(app: &AppHandle, profile: &str, source: Option<&WebviewWindow>) {
    let _ = app.emit(
        KEYMAP_CHANGED,
        KeymapChanged {
            profile,
            source: source.map(|window| window.label()),
        },
    );
}

/// Load the active profile into the engine and tell every window.
fn activate(
    app: &AppHandle,
    store: &ProfileStore,
    engine: &KeymapEngine,
    source: Option<&WebviewWindow>,
) -> Result<String, String> {
    let active = store.active();
    engine.set_keymap(active.clone(), store.get(&active)?);
    announce(app, &active, source);
    Ok(active)
}

#[tauri::command(async)]
pub fn list_profiles(store: Store<'_>) -> ProfileList {
    store.list()
}

#[tauri::command(async)]
pub fn get_profile(name: String, store: Store<'_>) -> Result<Keymap, String> {
    store.get(&name)
}

#[tauri::command(async)]
pub fn save_profile(
    window: WebviewWindow,
    name: String,
    keymap: Keymap,
    store: Store<'_>,
    engine: Engine<'_>,
) -> Result<(), String> {
    store.save(&name, &keymap)?;
    if store.active().eq_ignore_ascii_case(&name) {
        engine.set_keymap(store.active(), keymap);
        announce(window.app_handle(), &name, Some(&window));
    }
    Ok(())
}

#[tauri::command(async)]
pub fn create_profile(name: String, from: Option<String>, store: Store<'_>) -> Result<(), String> {
    store.create(&name, from.as_deref())
}

#[tauri::command(async)]
pub fn rename_profile(
    window: WebviewWindow,
    from: String,
    to: String,
    store: Store<'_>,
    engine: Engine<'_>,
) -> Result<(), String> {
    let was_active = store.active().eq_ignore_ascii_case(&from);
    store.rename(&from, &to)?;
    if was_active {
        activate(window.app_handle(), &store, &engine, Some(&window))?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn delete_profile(
    window: WebviewWindow,
    name: String,
    store: Store<'_>,
    engine: Engine<'_>,
) -> Result<(), String> {
    let was_active = store.active().eq_ignore_ascii_case(&name);
    store.delete(&name)?;
    if was_active {
        activate(window.app_handle(), &store, &engine, Some(&window))?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn set_active_profile(
    window: WebviewWindow,
    name: String,
    store: Store<'_>,
    engine: Engine<'_>,
) -> Result<(), String> {
    store.set_active(&name)?;
    activate(window.app_handle(), &store, &engine, Some(&window)).map(|_| ())
}

#[tauri::command(async)]
pub fn import_profile(path: PathBuf, store: Store<'_>) -> Result<String, String> {
    store.import(&path)
}

#[tauri::command(async)]
pub fn export_profile(name: String, path: PathBuf, store: Store<'_>) -> Result<(), String> {
    store.export(&name, &path)
}

#[tauri::command(async)]
pub fn reveal_profiles_dir(app: AppHandle, store: Store<'_>) -> Result<(), String> {
    let dir = store.profiles_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}
