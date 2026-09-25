//! Named keymap profiles in the app config folder:
//!
//! ```text
//! <app_config_dir>/
//!   settings.json          { "activeProfile": "<name>" }
//!   profiles/<name>.json   one keymap per profile
//! ```
//!
//! The bundled default is never written to disk. It appears as the read-only
//! "Default" profile, which can be duplicated.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use super::device::macro_eleven;
use super::keymap::{Extra, Keymap};
use super::storage::{write_atomic, write_json_atomic};

pub const DEFAULT_PROFILE: &str = "Default";
const MIGRATED_PROFILE: &str = "My keymap";
const MAX_NAME_LEN: usize = 48;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub name: String,
    pub read_only: bool,
    /// Last save, in milliseconds since the Unix epoch. None for Default.
    pub updated_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProfileList {
    pub active: String,
    pub profiles: Vec<ProfileSummary>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    active_profile: Option<String>,
    #[serde(flatten)]
    extra: Extra,
}

/// Profile files. A lock serializes changes so a rename cannot race a save.
pub struct ProfileStore {
    root: PathBuf,
    lock: Mutex<()>,
}

/// Names become file names: letters, digits, spaces, `_` and `-`, 1-48
/// characters, no leading or trailing space.
pub fn validate_name(name: &str) -> Result<(), String> {
    let valid_chars = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '_' | '-'));
    if name.is_empty()
        || name.len() > MAX_NAME_LEN
        || !valid_chars
        || name.trim() != name
    {
        return Err(format!(
            "Profile names use 1-{MAX_NAME_LEN} letters, numbers, spaces, - or _"
        ));
    }
    Ok(())
}

fn is_default(name: &str) -> bool {
    name.eq_ignore_ascii_case(DEFAULT_PROFILE)
}

fn modified_ms(path: &Path) -> Option<u64> {
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    Some(modified.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64)
}

impl ProfileStore {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            lock: Mutex::new(()),
        }
    }

    pub fn profiles_dir(&self) -> PathBuf {
        self.root.join("profiles")
    }

    fn settings_path(&self) -> PathBuf {
        self.root.join("settings.json")
    }

    fn path(&self, name: &str) -> PathBuf {
        self.profiles_dir().join(format!("{name}.json"))
    }

    fn guard(&self) -> std::sync::MutexGuard<'_, ()> {
        // The lock guards no data, so a panic elsewhere cannot corrupt it
        self.lock.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Saved profile names, sorted case-insensitively.
    fn names(&self) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(self.profiles_dir())
            .into_iter()
            .flatten()
            .filter_map(|entry| {
                let path = entry.ok()?.path();
                (path.extension()? == "json")
                    .then(|| path.file_stem()?.to_str().map(str::to_owned))
                    .flatten()
            })
            .filter(|name| validate_name(name).is_ok() && !is_default(name))
            .collect();
        names.sort_by_key(|name| name.to_lowercase());
        names
    }

    /// The stored name matching `name` case-insensitively, if any.
    fn find(&self, name: &str) -> Option<String> {
        if is_default(name) {
            return Some(DEFAULT_PROFILE.to_owned());
        }
        self.names().into_iter().find(|n| n.eq_ignore_ascii_case(name))
    }

    fn require(&self, name: &str) -> Result<String, String> {
        validate_name(name)?;
        self.find(name)
            .ok_or_else(|| format!("There is no profile named \"{name}\""))
    }

    /// A name for a new profile. Fails when the name is taken.
    fn claim(&self, name: &str) -> Result<(), String> {
        validate_name(name)?;
        match self.find(name) {
            Some(existing) => Err(format!("A profile named \"{existing}\" already exists")),
            None => Ok(()),
        }
    }

    fn read_settings(&self) -> Settings {
        fs::read_to_string(self.settings_path())
            .ok()
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or_default()
    }

    fn write_active(&self, name: &str) -> Result<(), String> {
        let mut settings = self.read_settings();
        settings.active_profile = Some(name.to_owned());
        write_json_atomic(&self.settings_path(), &settings)
    }

    /// The active profile, falling back to Default if it was removed.
    pub fn active(&self) -> String {
        self.read_settings()
            .active_profile
            .and_then(|name| self.find(&name))
            .unwrap_or_else(|| DEFAULT_PROFILE.to_owned())
    }

    pub fn list(&self) -> ProfileList {
        let _guard = self.guard();
        let mut profiles = vec![ProfileSummary {
            name: DEFAULT_PROFILE.to_owned(),
            read_only: true,
            updated_at: None,
        }];
        profiles.extend(self.names().into_iter().map(|name| ProfileSummary {
            updated_at: modified_ms(&self.path(&name)),
            name,
            read_only: false,
        }));
        ProfileList {
            active: self.active(),
            profiles,
        }
    }

    pub fn get(&self, name: &str) -> Result<Keymap, String> {
        let name = self.require(name)?;
        if is_default(&name) {
            return Ok(Keymap::bundled_default());
        }
        let json = fs::read_to_string(self.path(&name))
            .map_err(|e| format!("Could not read profile \"{name}\": {e}"))?;
        Keymap::parse(&json, macro_eleven()).map_err(|e| format!("Profile \"{name}\": {e}"))
    }

    pub fn save(&self, name: &str, keymap: &Keymap) -> Result<(), String> {
        let _guard = self.guard();
        let name = self.require(name)?;
        if is_default(&name) {
            return Err("The Default profile is read-only. Duplicate it to make changes.".into());
        }
        keymap.validate(macro_eleven())?;
        write_json_atomic(&self.path(&name), keymap)
    }

    /// Create a profile: a copy of `from`, or an empty layer 0.
    pub fn create(&self, name: &str, from: Option<&str>) -> Result<(), String> {
        let mut keymap = match from {
            Some(source) => self.get(source)?,
            None => Keymap::empty(),
        };
        let _guard = self.guard();
        self.claim(name)?;
        keymap.name = name.to_owned();
        write_json_atomic(&self.path(name), &keymap)
    }

    pub fn rename(&self, from: &str, to: &str) -> Result<(), String> {
        let mut keymap = self.get(from)?;
        let _guard = self.guard();
        let from = self.require(from)?;
        if is_default(&from) {
            return Err("The Default profile cannot be renamed".into());
        }
        if from == to {
            return Ok(());
        }
        // A change of case only ("notes" → "Notes") keeps the same slot
        if from.eq_ignore_ascii_case(to) {
            validate_name(to)?;
        } else {
            self.claim(to)?;
        }
        let was_active = self.active() == from;
        keymap.name = to.to_owned();

        // Move the old file aside first, so a change of case also renames the
        // file on case-insensitive disks; put it back if the write fails
        let old = self.path(&from);
        let parked = old.with_extension("json.renaming");
        fs::rename(&old, &parked).map_err(|e| format!("Could not rename \"{from}\": {e}"))?;
        if let Err(e) = write_json_atomic(&self.path(to), &keymap) {
            let _ = fs::rename(&parked, &old);
            return Err(e);
        }
        let _ = fs::remove_file(&parked);
        if was_active {
            self.write_active(to)?;
        }
        Ok(())
    }

    /// Delete a profile. Deleting the active profile makes Default active.
    pub fn delete(&self, name: &str) -> Result<(), String> {
        let _guard = self.guard();
        let name = self.require(name)?;
        if is_default(&name) {
            return Err("The Default profile cannot be deleted".into());
        }
        let was_active = self.active() == name;
        fs::remove_file(self.path(&name))
            .map_err(|e| format!("Could not delete \"{name}\": {e}"))?;
        if was_active {
            self.write_active(DEFAULT_PROFILE)?;
        }
        Ok(())
    }

    pub fn set_active(&self, name: &str) -> Result<String, String> {
        let _guard = self.guard();
        let name = self.require(name)?;
        self.write_active(&name)?;
        Ok(name)
    }

    /// Import a keymap file as a new profile named after the keymap, with a
    /// number added if the name is taken. Returns the new profile's name.
    pub fn import(&self, path: &Path) -> Result<String, String> {
        let json = fs::read_to_string(path)
            .map_err(|e| format!("Could not read {}: {e}", path.display()))?;
        let mut keymap = Keymap::parse(&json, macro_eleven())?;
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or_default();
        let _guard = self.guard();
        let name = self.unique_name(&[keymap.name.as_str(), stem]);
        keymap.name = name.clone();
        write_json_atomic(&self.path(&name), &keymap)?;
        Ok(name)
    }

    pub fn export(&self, name: &str, path: &Path) -> Result<(), String> {
        let keymap = self.get(name)?;
        let mut json = serde_json::to_string_pretty(&keymap)
            .map_err(|e| format!("Could not encode keymap: {e}"))?;
        json.push('\n');
        write_atomic(path, json.as_bytes())
    }

    /// First usable candidate, cleaned up and numbered until it is free.
    fn unique_name(&self, candidates: &[&str]) -> String {
        let base = candidates
            .iter()
            .map(|candidate| {
                let cleaned: String = candidate
                    .chars()
                    .filter(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '_' | '-'))
                    .take(MAX_NAME_LEN - 3)
                    .collect();
                cleaned.trim().to_owned()
            })
            .find(|name| !name.is_empty() && !is_default(name))
            .unwrap_or_else(|| "Imported".to_owned());
        std::iter::once(base.clone())
            .chain((2..).map(|n| format!("{base} {n}")))
            .find(|name| self.find(name).is_none())
            .expect("an unused name exists")
    }

    /// Move the pre-profiles `user-custom.json` into a profile, once: only
    /// when the profiles folder does not exist yet. Returns whether it did.
    ///
    /// A keymap that no longer passes validation is still copied, as is, but
    /// not made active: nothing is lost, and opening the profile names the
    /// problem so it can be fixed.
    pub fn migrate_legacy(&self, legacy_dir: &Path) -> Result<bool, String> {
        let _guard = self.guard();
        let dir = self.profiles_dir();
        if dir.exists() {
            return Ok(false);
        }
        fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;

        let legacy = legacy_dir.join("user-custom.json");
        let Ok(json) = fs::read_to_string(&legacy) else {
            return Ok(false);
        };
        let target = self.path(MIGRATED_PROFILE);
        match Keymap::parse(&json, macro_eleven()) {
            Ok(mut keymap) => {
                keymap.name = MIGRATED_PROFILE.to_owned();
                write_json_atomic(&target, &keymap)?;
                self.write_active(MIGRATED_PROFILE)?;
            }
            Err(e) => {
                write_atomic(&target, json.as_bytes())?;
                eprintln!("Copied {} without activating it: {e}", legacy.display());
            }
        }
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn store() -> (tempfile::TempDir, ProfileStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = ProfileStore::new(dir.path().join("config"));
        (dir, store)
    }

    fn names(store: &ProfileStore) -> Vec<String> {
        store.list().profiles.into_iter().map(|p| p.name).collect()
    }

    #[test]
    fn validates_names() {
        for good in ["My keymap", "work-2", "A_b", &"x".repeat(48)] {
            assert!(validate_name(good).is_ok(), "{good}");
        }
        for bad in ["", " lead", "trail ", "../up", "a/b", "semi;colon", "é", &"x".repeat(49)] {
            assert!(validate_name(bad).is_err(), "{bad:?}");
        }
    }

    #[test]
    fn default_is_bundled_and_read_only() {
        let (_dir, store) = store();
        let list = store.list();
        assert_eq!(list.active, DEFAULT_PROFILE);
        assert!(list.profiles[0].read_only);
        assert_eq!(store.get("Default").unwrap(), Keymap::bundled_default());
        assert!(store.save("Default", &Keymap::bundled_default()).is_err());
        assert!(store.delete("Default").is_err());
        assert!(!store.profiles_dir().join("Default.json").exists());
    }

    #[test]
    fn creates_duplicates_renames_and_deletes() {
        let (_dir, store) = store();
        store.create("Work", Some("Default")).unwrap();
        store.create("Blank", None).unwrap();
        assert_eq!(names(&store), ["Default", "Blank", "Work"]);
        assert_eq!(store.get("Blank").unwrap().layers.len(), 1);
        assert_eq!(store.get("Work").unwrap().name, "Work");
        assert!(store.create("work", None).is_err(), "names are case-insensitive");
        assert!(store.create("default", None).is_err());

        store.set_active("Work").unwrap();
        store.rename("Work", "work").unwrap();
        assert_eq!(names(&store), ["Default", "Blank", "work"]);
        store.rename("work", "Office").unwrap();
        assert_eq!(store.active(), "Office");
        assert_eq!(names(&store), ["Default", "Blank", "Office"]);

        store.delete("Office").unwrap();
        assert_eq!(store.active(), DEFAULT_PROFILE);
        assert!(store.get("Office").is_err());
    }

    #[test]
    fn rejects_invalid_keymaps_on_save() {
        let (_dir, store) = store();
        store.create("Work", None).unwrap();
        let mut keymap = store.get("Work").unwrap();
        keymap.layers.clear();
        assert!(store.save("Work", &keymap).is_err());
        assert!(store.get("Work").is_ok(), "the saved file is untouched");
    }

    #[test]
    fn round_trips_unknown_fields_through_save() {
        let (_dir, store) = store();
        store.create("Work", None).unwrap();
        let keymap: Keymap = serde_json::from_value(json!({
            "version": "1.0.0", "name": "Work", "futureField": [1, 2],
            "layers": { "0": { "name": "Base", "color": "teal", "keys": {
                "0,0": { "action": "shortcut", "keys": ["cmd", "t"], "description": "New tab" }
            } } }
        }))
        .unwrap();
        store.save("Work", &keymap).unwrap();
        let saved: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(store.path("Work")).unwrap()).unwrap();
        assert_eq!(saved["futureField"], json!([1, 2]));
        assert_eq!(saved["layers"]["0"]["color"], "teal");
        assert_eq!(saved["layers"]["0"]["keys"]["0,0"]["description"], "New tab");
    }

    #[test]
    fn export_then_import_keeps_the_keymap() {
        let (dir, store) = store();
        store.create("Work", Some("Default")).unwrap();
        let file = dir.path().join("exported.json");
        store.export("Work", &file).unwrap();
        let imported = store.import(&file).unwrap();
        assert_eq!(imported, "Work 2");
        let (original, copy) = (store.get("Work").unwrap(), store.get("Work 2").unwrap());
        assert_eq!(original.layers, copy.layers);
        assert_eq!(original.settings, copy.settings);
    }

    #[test]
    fn rejects_invalid_imports() {
        let (dir, store) = store();
        let file = dir.path().join("bad.json");
        fs::write(&file, r#"{ "version": "1", "name": "Bad", "layers": { "1": { "name": "x", "keys": {} } } }"#)
            .unwrap();
        assert!(store.import(&file).is_err());
        assert_eq!(names(&store), ["Default"]);
    }

    #[test]
    fn migrates_the_legacy_keymap_once() {
        let (dir, store) = store();
        let legacy = dir.path().join("legacy");
        fs::create_dir_all(&legacy).unwrap();
        let mut keymap = Keymap::bundled_default();
        keymap.name = "Old".into();
        fs::write(
            legacy.join("user-custom.json"),
            serde_json::to_string(&keymap).unwrap(),
        )
        .unwrap();

        assert!(store.migrate_legacy(&legacy).unwrap());
        assert_eq!(store.active(), MIGRATED_PROFILE);
        assert_eq!(store.get(MIGRATED_PROFILE).unwrap().layers, keymap.layers);

        store.delete(MIGRATED_PROFILE).unwrap();
        assert!(!store.migrate_legacy(&legacy).unwrap(), "runs only once");
        assert_eq!(names(&store), ["Default"]);
    }

    #[test]
    fn keeps_a_legacy_keymap_that_no_longer_validates() {
        let (dir, store) = store();
        let legacy = dir.path().join("legacy");
        fs::create_dir_all(&legacy).unwrap();
        let json = r#"{ "version": "1", "name": "Old", "layers": { "0": { "name": "Base", "keys": { "0,0": { "action": "shortcut", "keys": ["fn", "f"] } } } } }"#;
        fs::write(legacy.join("user-custom.json"), json).unwrap();

        assert!(store.migrate_legacy(&legacy).unwrap());
        assert_eq!(fs::read_to_string(store.path(MIGRATED_PROFILE)).unwrap(), json);
        assert_eq!(store.active(), DEFAULT_PROFILE, "not activated");
        assert_eq!(names(&store), ["Default", MIGRATED_PROFILE]);
        let error = store.get(MIGRATED_PROFILE).unwrap_err();
        assert!(error.contains("invalid shortcut"), "{error}");
    }

    #[test]
    fn starts_empty_without_a_legacy_keymap() {
        let (dir, store) = store();
        assert!(!store.migrate_legacy(&dir.path().join("missing")).unwrap());
        assert!(store.profiles_dir().is_dir());
        assert_eq!(store.active(), DEFAULT_PROFILE);
    }
}
