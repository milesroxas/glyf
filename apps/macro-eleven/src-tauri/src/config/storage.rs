//! File helpers for app data.

use serde::Serialize;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

/// Write `bytes` to `path` so a crash leaves either the old file or the new
/// one, never a partial file: write a sibling temp file, flush it to disk,
/// then rename it over the target.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("{} has no parent folder", path.display()))?;
    fs::create_dir_all(parent).map_err(|e| format!("Could not create {}: {e}", parent.display()))?;

    let mut tmp_name = path.as_os_str().to_owned();
    tmp_name.push(".tmp");
    let tmp = PathBuf::from(tmp_name);

    let result = File::create(&tmp)
        .and_then(|mut file| {
            file.write_all(bytes)?;
            file.sync_all()
        })
        .and_then(|()| fs::rename(&tmp, path));
    if let Err(e) = result {
        let _ = fs::remove_file(&tmp);
        return Err(format!("Could not save {}: {e}", path.display()));
    }
    Ok(())
}

/// Pretty JSON with a trailing newline, written atomically.
pub fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let mut json =
        serde_json::to_string_pretty(value).map_err(|e| format!("Could not encode JSON: {e}"))?;
    json.push('\n');
    write_atomic(path, json.as_bytes())
}

/// Where keymaps lived before profiles: `~/.config/macro-eleven/keymaps`.
pub fn legacy_keymaps_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(".config").join("macro-eleven").join("keymaps"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_the_file_and_leaves_no_temp_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("a.json");
        write_atomic(&path, b"one").unwrap();
        write_atomic(&path, b"two").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "two");
        let names: Vec<_> = fs::read_dir(path.parent().unwrap())
            .unwrap()
            .map(|e| e.unwrap().file_name())
            .collect();
        assert_eq!(names, vec!["a.json"]);
    }

    #[test]
    fn keeps_the_old_file_when_the_write_fails() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.json");
        write_atomic(&path, b"old").unwrap();
        // A directory where the temp file should go makes the write fail
        fs::create_dir(dir.path().join("a.json.tmp")).unwrap();
        assert!(write_atomic(&path, b"new").is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "old");
    }
}
