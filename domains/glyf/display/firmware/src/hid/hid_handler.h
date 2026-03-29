/**
 * USB Raw HID handler for glyf
 *
 * Protocol (32-byte reports, usage page 0xFF60):
 *
 *  HOST → DEVICE  (command report)
 *  ┌──────┬──────────────────────────────────────────────────────────┐
 *  │ [0]  │ Command byte                                             │
 *  │ [1…] │ Command arguments                                        │
 *  └──────┴──────────────────────────────────────────────────────────┘
 *
 *  Commands:
 *    0x01  Poll state          → device responds with state report
 *    0x02  Set brightness      [1] brightness 0–255
 *    0x03  Set display power   [1] 0=off 1=on
 *    0x04  Force display fill  [1–2] RGB565 colour high/low byte
 *
 *  DEVICE → HOST  (state report, response to 0x01)
 *  ┌──────┬─────────────────────┐
 *  │ [0]  │ 0x01 (echo)         │
 *  │ [1]  │ brightness          │
 *  │ [2]  │ display_on          │
 *  │ [3]  │ touch_pressed       │
 *  │ [4]  │ touch_x high byte   │
 *  │ [5]  │ touch_x low  byte   │
 *  │ [6]  │ touch_y high byte   │
 *  │ [7]  │ touch_y low  byte   │
 *  │ [8]  │ touch_z high byte   │
 *  │ [9]  │ touch_z low  byte   │
 *  │[10…] │ reserved / padding  │
 *  └──────┴─────────────────────┘
 */

#pragma once

#include <stdint.h>

#define HID_REPORT_SIZE   32
#define CMD_POLL_STATE    0x01
#define CMD_SET_BRIGHTNESS 0x02
#define CMD_SET_POWER     0x03
#define CMD_FILL_DISPLAY  0x04

/**
 * Process an incoming 32-byte HID report.
 * Must be called from the TinyUSB hid_set_report_cb / receive callback.
 */
void hid_handle_report(const uint8_t *buf, uint16_t len);

/**
 * Build a 32-byte state report into @p out (must be HID_REPORT_SIZE bytes).
 */
void hid_build_state_report(uint8_t *out);
