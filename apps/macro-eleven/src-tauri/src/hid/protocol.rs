use serde::Serialize;

use crate::firmware::version::Version;

pub const RAW_HID_REPORT_SIZE: usize = 32;
pub const RAW_HID_WRITE_SIZE: usize = 33; // macOS hidapi needs report ID prefix
pub const CMD_REPORT_STATE: u8 = 0x01;
pub const CMD_SET_TEST_MODE: u8 = 0x02;
// System commands, handled by every keymap (firmware macro_eleven.c)
pub const CMD_GET_INFO: u8 = 0x03;
pub const CMD_ENTER_BOOTLOADER: u8 = 0x04;
const BOOTLOADER_MAGIC: &[u8; 4] = b"BOOT";
const BOOTLOADER_FLAG_NO_MASS_STORAGE: u8 = 0x01;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct FirmwareInfo {
    pub protocol: u8,
    pub version: Version,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceState {
    pub keys: [bool; 11],
    pub pot_value: u16,
    pub layer: u8,
    pub test_mode: bool,
}

/// Build a 33-byte write buffer for macOS hidapi (report ID + 32-byte payload).
pub fn build_state_request() -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00; // Report ID (0x00 for devices without numbered reports)
    buf[1] = CMD_REPORT_STATE;
    buf
}

/// Build a test mode command (33 bytes for macOS hidapi).
pub fn build_test_mode_command(enable: bool) -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00; // Report ID
    buf[1] = CMD_SET_TEST_MODE;
    buf[2] = if enable { 1 } else { 0 };
    buf
}

/// Parse a 32-byte response into DeviceState.
/// Format: [0x01, key_lo, key_hi, pot_lo, pot_hi, layer, test_mode, ...]
pub fn parse_state_response(buf: &[u8; RAW_HID_REPORT_SIZE]) -> Option<DeviceState> {
    if buf[0] != CMD_REPORT_STATE {
        return None;
    }

    let key_bits = (buf[1] as u16) | ((buf[2] as u16) << 8);
    let mut keys = [false; 11];
    for (i, key) in keys.iter_mut().enumerate() {
        *key = (key_bits >> i) & 1 == 1;
    }

    let pot_value = (buf[3] as u16) | ((buf[4] as u16) << 8);
    let layer = buf[5];
    let test_mode = buf[6] != 0;

    Some(DeviceState {
        keys,
        pot_value,
        layer,
        test_mode,
    })
}

/// Build a firmware info request (33 bytes for macOS hidapi).
pub fn build_info_request() -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[1] = CMD_GET_INFO;
    buf
}

/// Parse a firmware info response.
/// Format: [0x03, protocol, major, minor, patch, ...]
pub fn parse_info_response(buf: &[u8; RAW_HID_REPORT_SIZE]) -> Option<FirmwareInfo> {
    if buf[0] != CMD_GET_INFO {
        return None;
    }
    Some(FirmwareInfo {
        protocol: buf[1],
        version: Version::new(buf[2], buf[3], buf[4]),
    })
}

/// Build the command that reboots the device into the RP2040 USB bootloader.
/// `hide_mass_storage` keeps the RPI-RP2 drive from mounting when the host
/// flashes over PICOBOOT.
pub fn build_enter_bootloader_command(hide_mass_storage: bool) -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[1] = CMD_ENTER_BOOTLOADER;
    buf[2..6].copy_from_slice(BOOTLOADER_MAGIC);
    buf[6] = if hide_mass_storage {
        BOOTLOADER_FLAG_NO_MASS_STORAGE
    } else {
        0
    };
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_info_response() {
        let mut buf = [0u8; RAW_HID_REPORT_SIZE];
        buf[..5].copy_from_slice(&[CMD_GET_INFO, 1, 1, 2, 3]);
        let info = parse_info_response(&buf).unwrap();
        assert_eq!(info.protocol, 1);
        assert_eq!(info.version, Version::new(1, 2, 3));

        buf[0] = CMD_REPORT_STATE;
        assert!(parse_info_response(&buf).is_none());
    }

    #[test]
    fn bootloader_command_carries_magic_and_flag() {
        let cmd = build_enter_bootloader_command(true);
        assert_eq!(
            &cmd[..7],
            &[0, CMD_ENTER_BOOTLOADER, b'B', b'O', b'O', b'T', 1]
        );
        assert_eq!(build_enter_bootloader_command(false)[6], 0);
    }
}
