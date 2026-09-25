//! Fallback flashing through the bootloader's RPI-RP2 USB drive: copying a
//! UF2 file onto it flashes the device, which then reboots itself. Used where
//! PICOBOOT can't be opened, e.g. Windows without a WinUSB driver bound.

use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

const INFO_FILE: &str = "INFO_UF2.TXT";
const BOARD_ID: &str = "Board-ID: RPI-RP2";

fn subdirectories(parent: &Path) -> Vec<PathBuf> {
    fs::read_dir(parent)
        .into_iter()
        .flatten()
        .flatten()
        .map(|entry| entry.path())
        .collect()
}

fn candidate_roots() -> Vec<PathBuf> {
    if cfg!(target_os = "windows") {
        (b'D'..=b'Z')
            .map(|letter| PathBuf::from(format!("{}:\\", letter as char)))
            .collect()
    } else if cfg!(target_os = "macos") {
        subdirectories(Path::new("/Volumes"))
    } else {
        // /media/<label>, /media/<user>/<label> or /run/media/<user>/<label>
        let mounts: Vec<PathBuf> = ["/media", "/run/media"]
            .iter()
            .flat_map(|parent| subdirectories(Path::new(parent)))
            .collect();
        let nested: Vec<PathBuf> = mounts.iter().flat_map(|dir| subdirectories(dir)).collect();
        mounts.into_iter().chain(nested).collect()
    }
}

fn is_rp2040_drive(root: &Path) -> bool {
    fs::read_to_string(root.join(INFO_FILE))
        .map(|info| info.contains(BOARD_ID))
        .unwrap_or(false)
}

/// Mount point of an RP2040 bootloader drive, if one is mounted.
pub fn find_volume() -> Option<PathBuf> {
    candidate_roots()
        .into_iter()
        .find(|root| is_rp2040_drive(root))
}

pub fn copy_uf2(volume: &Path, uf2: &[u8]) -> Result<(), String> {
    let mut file = File::create(volume.join("macro_eleven.uf2"))
        .map_err(|e| format!("Failed to open the RPI-RP2 drive: {e}"))?;
    file.write_all(uf2)
        .map_err(|e| format!("Failed to copy firmware to the RPI-RP2 drive: {e}"))?;
    // The device reboots as soon as it has every block, which can fail the
    // flush. The updater confirms success by reading the new version back.
    let _ = file.sync_all();
    Ok(())
}
