use serde::Serialize;

pub const RAW_HID_REPORT_SIZE: usize = 32;
pub const RAW_HID_WRITE_SIZE: usize = 33; // macOS hidapi needs report ID prefix

pub const CMD_POLL_STATE: u8 = 0x01;
pub const CMD_SET_BRIGHTNESS: u8 = 0x02;
pub const CMD_SET_POWER: u8 = 0x03;
pub const CMD_FILL_DISPLAY: u8 = 0x04;

/// Parsed device state from a 0x01 poll response.
#[derive(Debug, Clone, Serialize)]
pub struct DeviceState {
    pub brightness: u8,
    pub display_on: bool,
    pub touch_pressed: bool,
    /// Pixel X (0–479)
    pub touch_x: u16,
    /// Pixel Y (0–319)
    pub touch_y: u16,
    /// Raw pressure 0–4095
    pub touch_z: u16,
}

/// Build a 33-byte poll-state request (report ID prefix + 32 bytes).
pub fn build_poll_request() -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00; // report ID
    buf[1] = CMD_POLL_STATE;
    buf
}

/// Build a set-brightness command.
pub fn build_brightness_command(brightness: u8) -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00;
    buf[1] = CMD_SET_BRIGHTNESS;
    buf[2] = brightness;
    buf
}

/// Build a set-power command (on = true → display on).
pub fn build_power_command(on: bool) -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00;
    buf[1] = CMD_SET_POWER;
    buf[2] = if on { 1 } else { 0 };
    buf
}

/// Parse a 32-byte state report.
///
/// Format:
///   [0]   0x01 echo
///   [1]   brightness
///   [2]   display_on
///   [3]   touch_pressed
///   [4–5] touch_x big-endian
///   [6–7] touch_y big-endian
///   [8–9] touch_z big-endian
pub fn parse_state_response(buf: &[u8; RAW_HID_REPORT_SIZE]) -> Option<DeviceState> {
    if buf[0] != CMD_POLL_STATE {
        return None;
    }
    Some(DeviceState {
        brightness: buf[1],
        display_on: buf[2] != 0,
        touch_pressed: buf[3] != 0,
        touch_x: ((buf[4] as u16) << 8) | buf[5] as u16,
        touch_y: ((buf[6] as u16) << 8) | buf[7] as u16,
        touch_z: ((buf[8] as u16) << 8) | buf[9] as u16,
    })
}
