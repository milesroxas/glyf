//! Output volume through CoreAudio. The virtual main volume is the value the
//! menu bar slider shows; it works on devices without a main volume control.

use std::ffi::{c_char, c_void};
use std::mem::size_of;
use std::ptr;
use std::sync::OnceLock;

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

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFPreferencesAnyApplication: *const c_void;
    fn CFStringCreateWithCString(
        allocator: *const c_void,
        string: *const c_char,
        encoding: u32,
    ) -> *const c_void;
    fn CFURLCreateFromFileSystemRepresentation(
        allocator: *const c_void,
        path: *const u8,
        length: isize,
        is_directory: u8,
    ) -> *const c_void;
    fn CFPreferencesGetAppBooleanValue(
        key: *const c_void,
        application: *const c_void,
        valid: *mut u8,
    ) -> u8;
    fn CFRelease(object: *const c_void);
}

#[link(name = "AudioToolbox", kind = "framework")]
extern "C" {
    fn AudioServicesCreateSystemSoundID(url: *const c_void, sound: *mut u32) -> OsStatus;
    fn AudioServicesSetProperty(
        property: u32,
        specifier_size: u32,
        specifier: *const c_void,
        data_size: u32,
        data: *const c_void,
    ) -> OsStatus;
    fn AudioServicesPlaySystemSound(sound: u32);
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

/// The sound the volume keys play.
const FEEDBACK_SOUND: &str =
    "/System/Library/LoginPlugins/BezelServices.loginPlugin/Contents/Resources/volume.aiff";
/// Sound > "Play feedback when volume is changed", in the global domain.
const FEEDBACK_SETTING: &std::ffi::CStr = c"com.apple.sound.beep.feedback";
const CF_STRING_ENCODING_UTF8: u32 = 0x0800_0100;
/// `kAudioServicesPropertyIsUISound`: 0 plays through the default output
/// (where the volume changed), not the alert device.
const IS_UI_SOUND: u32 = four_cc(b"isui");

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

fn feedback_enabled() -> bool {
    // SAFETY: the key is a valid C string; every CF object made is released
    unsafe {
        let key = CFStringCreateWithCString(
            ptr::null(),
            FEEDBACK_SETTING.as_ptr(),
            CF_STRING_ENCODING_UTF8,
        );
        if key.is_null() {
            return false;
        }
        let mut valid = 0;
        let enabled =
            CFPreferencesGetAppBooleanValue(key, kCFPreferencesAnyApplication, &mut valid);
        CFRelease(key);
        enabled != 0
    }
}

/// Register the feedback sound. `None` if the file is missing.
fn load_feedback_sound() -> Option<u32> {
    // SAFETY: the path bytes outlive the call; the URL is released
    unsafe {
        let url = CFURLCreateFromFileSystemRepresentation(
            ptr::null(),
            FEEDBACK_SOUND.as_ptr(),
            FEEDBACK_SOUND.len() as isize,
            0,
        );
        if url.is_null() {
            return None;
        }
        let mut sound = 0;
        let status = AudioServicesCreateSystemSoundID(url, &mut sound);
        CFRelease(url);
        if status != 0 {
            return None;
        }
        let not_ui: u32 = 0;
        AudioServicesSetProperty(
            IS_UI_SOUND,
            size_of::<u32>() as u32,
            &sound as *const u32 as *const c_void,
            size_of::<u32>() as u32,
            &not_ui as *const u32 as *const c_void,
        );
        Some(sound)
    }
}

#[derive(Default)]
pub struct CoreAudioVolume {
    feedback_sound: OnceLock<Option<u32>>,
}

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

    fn play_feedback(&self) {
        if !feedback_enabled() {
            return;
        }
        if let Some(sound) = *self.feedback_sound.get_or_init(load_feedback_sound) {
            // SAFETY: `sound` came from AudioServicesCreateSystemSoundID
            unsafe { AudioServicesPlaySystemSound(sound) };
        }
    }
}
