use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::firmware::bundle;
use crate::firmware::updater::{self, Stage};
use crate::firmware::version::Version;
use crate::hid::connection::HidConnection;
use crate::hid::protocol::FirmwareInfo;

static UPDATE_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceMode {
    Disconnected,
    /// Running firmware; `version` is null for firmware that predates GET_INFO.
    Ready,
    /// An RP2040 is in its USB bootloader.
    Bootloader,
    Updating,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareStatus {
    mode: DeviceMode,
    version: Option<Version>,
    bundled_version: Version,
    update_available: bool,
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    stage: Stage,
    fraction: f64,
}

/// Released when the update finishes, however it ends.
struct UpdateLock;

impl UpdateLock {
    fn acquire() -> Result<Self, String> {
        UPDATE_RUNNING
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map(|_| UpdateLock)
            .map_err(|_| "A firmware update is already running".to_string())
    }
}

impl Drop for UpdateLock {
    fn drop(&mut self) {
        UPDATE_RUNNING.store(false, Ordering::SeqCst);
    }
}

#[tauri::command]
pub fn get_firmware_status(
    app: AppHandle,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<FirmwareStatus, String> {
    let bundled_version = bundle::version(&app)?;
    let status = |mode, version: Option<Version>| FirmwareStatus {
        mode,
        version,
        bundled_version,
        update_available: match mode {
            DeviceMode::Ready => version.is_none_or(|v| v < bundled_version),
            // Could be any RP2040 board, so the firmware page offers recovery
            // instead of announcing an update
            _ => false,
        },
    };

    if UPDATE_RUNNING.load(Ordering::SeqCst) {
        return Ok(status(DeviceMode::Updating, None));
    }

    // The poll thread owns the device and caches its firmware info
    let firmware = connection
        .lock()
        .map_err(|e| e.to_string())?
        .connected_firmware();

    Ok(match firmware {
        Some(info) => status(DeviceMode::Ready, info.map(|i| i.version)),
        None if updater::bootloader_present() => status(DeviceMode::Bootloader, None),
        None => status(DeviceMode::Disconnected, None),
    })
}

#[tauri::command]
pub async fn update_firmware(
    app: AppHandle,
    connection: State<'_, Mutex<HidConnection>>,
) -> Result<FirmwareInfo, String> {
    let _lock = UpdateLock::acquire()?;
    let firmware = bundle::load(&app)?;
    let suspension = connection.lock().map_err(|e| e.to_string())?.suspend();

    tauri::async_runtime::spawn_blocking(move || {
        suspension.wait_for_release();
        updater::update_device(&firmware, &mut |stage, fraction| {
            let _ = app.emit(
                "macro11:firmware-progress",
                ProgressEvent { stage, fraction },
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
