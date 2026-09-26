//! Output volume through CoreAudio. The virtual main volume is the value the
//! menu bar slider shows; it works on devices without a main volume control.

use std::ffi::c_void;
use std::mem::size_of;
use std::ptr;

use super::SystemVolume;

type AudioObjectId = u32;
type OsStatus = i32;

#[repr(C)]
struct PropertyAddress {
    selector: u32,
    scope: u32,
    element: u32,
}

#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioObjectHasProperty(object: AudioObjectId, address: *const PropertyAddress) -> u8;
    fn AudioObjectGetPropertyData(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        data_size: *mut u32,
        data: *mut c_void,
    ) -> OsStatus;
    fn AudioObjectSetPropertyData(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        data_size: u32,
        data: *const c_void,
    ) -> OsStatus;
}

const fn four_cc(code: &[u8; 4]) -> u32 {
    u32::from_be_bytes(*code)
}

const SYSTEM_OBJECT: AudioObjectId = 1;
const DEFAULT_OUTPUT_DEVICE: PropertyAddress = PropertyAddress {
    selector: four_cc(b"dOut"),
    scope: four_cc(b"glob"),
    element: 0,
};
const VIRTUAL_MAIN_VOLUME: PropertyAddress = PropertyAddress {
    selector: four_cc(b"vmvc"),
    scope: four_cc(b"outp"),
    element: 0,
};
const MUTE: PropertyAddress = PropertyAddress {
    selector: four_cc(b"mute"),
    scope: four_cc(b"outp"),
    element: 0,
};

/// Read a fixed-size property.
fn get<T: Copy + Default>(object: AudioObjectId, address: &PropertyAddress) -> Result<T, OsStatus> {
    let mut value = T::default();
    let mut size = size_of::<T>() as u32;
    // SAFETY: `value` is a plain `T` of `size` bytes that CoreAudio writes into
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            address,
            0,
            ptr::null(),
            &mut size,
            &mut value as *mut T as *mut c_void,
        )
    };
    if status == 0 {
        Ok(value)
    } else {
        Err(status)
    }
}

/// Write a fixed-size property.
fn set<T: Copy>(object: AudioObjectId, address: &PropertyAddress, value: T) -> Result<(), OsStatus> {
    // SAFETY: `value` is a plain `T` that CoreAudio reads `size_of::<T>()` bytes from
    let status = unsafe {
        AudioObjectSetPropertyData(
            object,
            address,
            0,
            ptr::null(),
            size_of::<T>() as u32,
            &value as *const T as *const c_void,
        )
    };
    if status == 0 {
        Ok(())
    } else {
        Err(status)
    }
}

/// The current default output device. Looked up on every call, so the knob
/// follows the user switching outputs.
fn output_device() -> Result<AudioObjectId, String> {
    match get::<AudioObjectId>(SYSTEM_OBJECT, &DEFAULT_OUTPUT_DEVICE) {
        Ok(0) => Err("No sound output device".into()),
        Ok(device) => Ok(device),
        Err(status) => Err(format!("Could not find the sound output device ({status})")),
    }
}

pub struct CoreAudioVolume;

impl SystemVolume for CoreAudioVolume {
    fn get(&self) -> Result<f32, String> {
        get::<f32>(output_device()?, &VIRTUAL_MAIN_VOLUME)
            .map_err(|status| format!("This sound output has no volume control ({status})"))
    }

    fn set(&self, volume: f32) -> Result<(), String> {
        let device = output_device()?;
        set(device, &VIRTUAL_MAIN_VOLUME, volume.clamp(0.0, 1.0))
            .map_err(|status| format!("Could not set the volume ({status})"))?;

        // SAFETY: `MUTE` is a valid property address
        if unsafe { AudioObjectHasProperty(device, &MUTE) } != 0 {
            let muted = u32::from(volume <= 0.0);
            if get::<u32>(device, &MUTE).is_ok_and(|current| current != muted) {
                let _ = set(device, &MUTE, muted);
            }
        }
        Ok(())
    }
}
