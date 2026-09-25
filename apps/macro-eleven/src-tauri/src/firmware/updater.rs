//! End-to-end device update: hand the running firmware off to the RP2040 USB
//! bootloader, flash, then wait for the new firmware to report its version.
//!
//! The RP2040 bootloader lives in ROM, so a failed update can always be
//! retried: the device stays in (or falls back to) the bootloader, and
//! `update_device` picks it up from there.

use hidapi::{HidApi, HidDevice};
use serde::Serialize;
use std::thread;
use std::time::{Duration, Instant};

use super::picoboot::{self, FlashPhase};
use super::{mass_storage, Firmware};
use crate::hid::connection::{detect_device, open_device, query_firmware_info};
use crate::hid::protocol::{build_enter_bootloader_command, build_test_mode_command, FirmwareInfo};

const BOOTLOADER_TIMEOUT: Duration = Duration::from_secs(15);
/// Firmware older than the ENTER_BOOTLOADER command can't reboot itself.
/// Leave time for the user to hold the HOME key.
const MANUAL_BOOTLOADER_TIMEOUT: Duration = Duration::from_secs(90);
const RESTART_TIMEOUT: Duration = Duration::from_secs(20);
const POLL_INTERVAL: Duration = Duration::from_millis(200);
const OPEN_ATTEMPTS: usize = 5;

/// Hide the RPI-RP2 drive except on Windows, where PICOBOOT needs a WinUSB
/// driver and the drive is the fallback.
const HIDE_MASS_STORAGE: bool = !cfg!(target_os = "windows");

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Stage {
    EnteringBootloader,
    /// Old firmware: waiting for the user to hold HOME for 2 seconds.
    WaitingForBootloader,
    Writing,
    Verifying,
    Restarting,
    Done,
}

/// True when an RP2040 is in its USB bootloader. USB enumeration only, so it
/// is cheap to poll and works on Windows without a PICOBOOT driver.
pub fn bootloader_present() -> bool {
    picoboot::is_present()
}

/// Open the device, retrying briefly in case a status check has it open.
fn open_device_with_retry(api: &HidApi) -> Option<HidDevice> {
    for _ in 0..OPEN_ATTEMPTS {
        if let Some(device) = open_device(api) {
            return Some(device);
        }
        thread::sleep(POLL_INTERVAL);
    }
    None
}

/// Update the connected device to `firmware`. `report` receives each stage
/// with its completion fraction (0.0-1.0).
pub fn update_device(
    firmware: &Firmware,
    report: &mut dyn FnMut(Stage, f64),
) -> Result<FirmwareInfo, String> {
    let timeout = enter_bootloader(report)?;
    flash_when_ready(firmware, timeout, report)?;

    report(Stage::Restarting, 0.0);
    let info = wait_for_firmware()?;
    if let Some(expected) = firmware.version {
        if info.version != expected {
            return Err(format!(
                "Device restarted with firmware {}, expected {expected}",
                info.version
            ));
        }
    }
    report(Stage::Done, 1.0);
    Ok(info)
}

/// Reboot the device into its bootloader. Returns how long to wait for it.
fn enter_bootloader(report: &mut dyn FnMut(Stage, f64)) -> Result<Duration, String> {
    let api = HidApi::new().map_err(|e| e.to_string())?;
    let Some(device) = open_device_with_retry(&api) else {
        if bootloader_present() {
            // Interrupted update, or bootloader entered by hand
            return Ok(BOOTLOADER_TIMEOUT);
        }
        if detect_device() {
            return Err("Macro Eleven is in use by another app. Close it, then try again.".into());
        }
        return Err("Macro Eleven not found. Check the USB connection.".into());
    };

    // Never flash a different board that happens to be waiting in its bootloader
    if bootloader_present() {
        return Err(
            "Another RP2040 board is in bootloader mode. Disconnect it, then try again.".into(),
        );
    }

    report(Stage::EnteringBootloader, 0.0);
    let write = |cmd: &[u8]| {
        device
            .write(cmd)
            .map(|_| ())
            .map_err(|e| format!("Failed to reach Macro Eleven: {e}"))
    };
    if query_firmware_info(&device).is_some() {
        write(&build_enter_bootloader_command(HIDE_MASS_STORAGE))?;
        Ok(BOOTLOADER_TIMEOUT)
    } else {
        // Test mode blocks the HOME key hold in old firmware
        write(&build_test_mode_command(false))?;
        report(Stage::WaitingForBootloader, 0.0);
        Ok(MANUAL_BOOTLOADER_TIMEOUT)
    }
}

/// Flash once the bootloader shows up. PICOBOOT first; the RPI-RP2 drive when
/// PICOBOOT can't be opened.
fn flash_when_ready(
    firmware: &Firmware,
    timeout: Duration,
    report: &mut dyn FnMut(Stage, f64),
) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    let mut last_error = None;
    loop {
        // Never guess which board to flash
        if picoboot::bootloader_count() > 1 {
            return Err(picoboot::MULTIPLE_BOOTLOADERS.into());
        }
        if picoboot::is_present() {
            match picoboot::Connection::open() {
                Ok(conn) => {
                    return conn.flash(&firmware.image, |phase, fraction| {
                        let stage = match phase {
                            FlashPhase::Writing => Stage::Writing,
                            FlashPhase::Verifying => Stage::Verifying,
                        };
                        report(stage, fraction)
                    });
                }
                // Expected on Windows without a WinUSB driver; the drive path follows
                Err(e) => last_error = Some(e),
            }
        }
        if let Some(volume) = mass_storage::find_volume() {
            report(Stage::Writing, 0.0);
            mass_storage::copy_uf2(&volume, &firmware.uf2)?;
            report(Stage::Writing, 1.0);
            return Ok(());
        }
        if Instant::now() >= deadline {
            return Err(
                last_error.unwrap_or_else(|| "Macro Eleven didn't enter update mode".into())
            );
        }
        thread::sleep(POLL_INTERVAL);
    }
}

fn wait_for_firmware() -> Result<FirmwareInfo, String> {
    let deadline = Instant::now() + RESTART_TIMEOUT;
    while Instant::now() < deadline {
        thread::sleep(POLL_INTERVAL);
        let Ok(api) = HidApi::new() else { continue };
        if let Some(info) = open_device(&api).as_ref().and_then(query_firmware_info) {
            return Ok(info);
        }
    }
    Err(
        "Macro Eleven didn't restart after the update. Unplug it, plug it back in, then try again."
            .into(),
    )
}
