//! Firmware shipped inside the app bundle (`src-tauri/firmware/`), written by
//! `domains/prototypes/macropads/macro-eleven/bundle-firmware.sh`.

use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager};

use super::version::Version;
use super::Firmware;

#[derive(Deserialize)]
struct Manifest {
    version: String,
    file: String,
    sha256: String,
}

fn resource_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    app.path()
        .resolve(Path::new("firmware").join(name), BaseDirectory::Resource)
        .map_err(|e| format!("Bundled firmware not found: {e}"))
}

fn read_manifest(app: &AppHandle) -> Result<(Manifest, Version), String> {
    let path = resource_path(app, "manifest.json")?;
    let text =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    let manifest: Manifest =
        serde_json::from_str(&text).map_err(|e| format!("Invalid firmware manifest: {e}"))?;
    let version = Version::parse(&manifest.version)
        .ok_or_else(|| format!("Invalid firmware version \"{}\"", manifest.version))?;
    Ok((manifest, version))
}

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// Version of the bundled firmware.
pub fn version(app: &AppHandle) -> Result<Version, String> {
    read_manifest(app).map(|(_, version)| version)
}

/// Load and integrity-check the bundled firmware.
pub fn load(app: &AppHandle) -> Result<Firmware, String> {
    let (manifest, version) = read_manifest(app)?;
    if Path::new(&manifest.file).file_name() != Some(manifest.file.as_ref()) {
        return Err(format!("Invalid firmware file name \"{}\"", manifest.file));
    }
    let uf2 = fs::read(resource_path(app, &manifest.file)?)
        .map_err(|e| format!("Failed to read bundled firmware: {e}"))?;

    if !sha256_hex(&uf2).eq_ignore_ascii_case(&manifest.sha256) {
        return Err("Bundled firmware is corrupt (checksum mismatch)".into());
    }

    Firmware::from_uf2(uf2, Some(version))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::firmware::uf2::{FlashImage, FLASH_START};

    #[test]
    fn bundled_firmware_matches_manifest() {
        let manifest: Manifest =
            serde_json::from_str(include_str!("../../firmware/manifest.json")).unwrap();
        let uf2 = include_bytes!("../../firmware/macro_eleven.uf2");

        assert_eq!(manifest.file, "macro_eleven.uf2");
        assert!(Version::parse(&manifest.version).is_some());
        assert_eq!(sha256_hex(uf2), manifest.sha256);
        let image = FlashImage::parse(uf2).unwrap();
        assert_eq!(image.sectors().next().unwrap().0, FLASH_START);
    }
}
