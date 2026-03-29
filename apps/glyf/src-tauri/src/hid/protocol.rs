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

/// Build a fill-display command (full screen RGB565).
pub fn build_fill_display_command(rgb565: u16) -> [u8; RAW_HID_WRITE_SIZE] {
    let mut buf = [0u8; RAW_HID_WRITE_SIZE];
    buf[0] = 0x00;
    buf[1] = CMD_FILL_DISPLAY;
    buf[2] = (rgb565 >> 8) as u8;
    buf[3] = rgb565 as u8;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn poll_request_has_expected_prefix() {
        let buf = build_poll_request();
        assert_eq!(buf[0], 0x00);
        assert_eq!(buf[1], CMD_POLL_STATE);
    }

    #[test]
    fn brightness_command_encodes_value() {
        let buf = build_brightness_command(200);
        assert_eq!(buf[1], CMD_SET_BRIGHTNESS);
        assert_eq!(buf[2], 200);
    }

    #[test]
    fn power_command_encodes_on_off() {
        assert_eq!(build_power_command(true)[2], 1);
        assert_eq!(build_power_command(false)[2], 0);
    }

    #[test]
    fn fill_display_command_is_big_endian_rgb565() {
        let buf = build_fill_display_command(0xf800);
        assert_eq!(buf[1], CMD_FILL_DISPLAY);
        assert_eq!(buf[2], 0xf8);
        assert_eq!(buf[3], 0x00);
    }

    #[test]
    fn parse_state_response_reads_big_endian_fields() {
        let mut buf = [0u8; RAW_HID_REPORT_SIZE];
        buf[0] = CMD_POLL_STATE;
        buf[1] = 128;
        buf[2] = 1;
        buf[3] = 1;
        buf[4] = 0x01;
        buf[5] = 0x23;
        buf[6] = 0x04;
        buf[7] = 0x56;
        buf[8] = 0x0a;
        buf[9] = 0xbc;
        let s = parse_state_response(&buf).expect("valid echo");
        assert_eq!(s.brightness, 128);
        assert!(s.display_on);
        assert!(s.touch_pressed);
        assert_eq!(s.touch_x, 0x0123);
        assert_eq!(s.touch_y, 0x0456);
        assert_eq!(s.touch_z, 0x0abc);
    }

    #[test]
    fn parse_state_response_rejects_wrong_echo() {
        let mut buf = [0u8; RAW_HID_REPORT_SIZE];
        buf[0] = 0xff;
        assert!(parse_state_response(&buf).is_none());
    }
}
