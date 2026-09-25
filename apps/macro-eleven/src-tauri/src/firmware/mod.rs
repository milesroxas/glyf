//! Device firmware updates: the image bundled with the app, the handoff from
//! running firmware to the RP2040 USB bootloader, and flashing.

pub mod bundle;
pub mod mass_storage;
pub mod picoboot;
pub mod uf2;
pub mod updater;
pub mod version;

use uf2::FlashImage;
use version::Version;

/// A firmware image ready to flash.
pub struct Firmware {
    /// Version the image reports once running, when known.
    pub version: Option<Version>,
    pub uf2: Vec<u8>,
    pub image: FlashImage,
}

impl Firmware {
    pub fn from_uf2(uf2: Vec<u8>, version: Option<Version>) -> Result<Self, String> {
        let image = FlashImage::parse(&uf2)?;
        Ok(Self {
            version,
            uf2,
            image,
        })
    }
}
