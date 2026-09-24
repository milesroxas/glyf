use serde::Serialize;

pub const RAW_HID_REPORT_SIZE: usize = 32;
pub const RAW_HID_WRITE_SIZE: usize = 33; // macOS hidapi needs report ID prefix
pub const CMD_REPORT_STATE: u8 = 0x01;
pub const CMD_SET_TEST_MODE: u8 = 0x02;

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
