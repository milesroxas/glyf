/**
 * USB Raw HID handler – glyf firmware
 */

#include "hid_handler.h"
#include "../display/st7796s.h"
#include "../touch/xpt2046.h"
#include "../pinout.h"

#include <string.h>

// Shared state (written by HID commands, read by hid_build_state_report)
static uint8_t  s_brightness  = 200;
static uint8_t  s_display_on  = 1;

void hid_handle_report(const uint8_t *buf, uint16_t len) {
    if (len < 1) return;

    switch (buf[0]) {
        case CMD_POLL_STATE:
            // Nothing to do here; caller will call hid_build_state_report
            break;

        case CMD_SET_BRIGHTNESS:
            if (len >= 2) {
                s_brightness = buf[1];
                st7796s_set_backlight(s_brightness);
            }
            break;

        case CMD_SET_POWER:
            if (len >= 2) {
                s_display_on = buf[1] ? 1 : 0;
                st7796s_set_power(s_display_on != 0);
            }
            break;

        case CMD_FILL_DISPLAY:
            if (len >= 3) {
                uint16_t color = ((uint16_t)buf[1] << 8) | buf[2];
                st7796s_fill(color);
            }
            break;

        default:
            break;
    }
}

void hid_build_state_report(uint8_t *out) {
    memset(out, 0, GLYF_HID_REPORT_SIZE);

    xpt2046_point_t touch = xpt2046_read(NULL);

    out[0] = CMD_POLL_STATE;
    out[1] = s_brightness;
    out[2] = s_display_on;
    out[3] = touch.pressed ? 1 : 0;
    out[4] = (uint8_t)(touch.x >> 8);
    out[5] = (uint8_t)(touch.x & 0xFF);
    out[6] = (uint8_t)(touch.y >> 8);
    out[7] = (uint8_t)(touch.y & 0xFF);
    // Encode pressure as 12-bit (0–4095)
    uint16_t pz = (uint16_t)(touch.pressure * 4095.0f);
    out[8] = (uint8_t)(pz >> 8);
    out[9] = (uint8_t)(pz & 0xFF);
}
