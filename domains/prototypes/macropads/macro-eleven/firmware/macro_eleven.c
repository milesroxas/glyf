// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include <string.h>
#include "macro_eleven.h"
#include "raw_hid.h"
#include "pico/bootrom.h"
#include "version.h"

// Format version of the system commands. Bump when their layout changes.
#define M11_HID_PROTOCOL_VERSION 1

// ENTER_BOOTLOADER request: [0x04, 'B', 'O', 'O', 'T', flags]. The magic stops
// a stray report from rebooting the device. Flag bit 0 hides the USB drive
// because the app flashes over PICOBOOT and the drive would only pop up in the OS.
#define M11_BOOTLOADER_FLAG_NO_MASS_STORAGE 0x01
// reset_usb_boot() interface mask bit for the mass-storage interface.
#define RP2040_BOOTROM_DISABLE_MASS_STORAGE 0x01
// Time for the acknowledgement to reach the host before USB drops.
#define M11_BOOTLOADER_DELAY_MS 50

static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;

static bool bootloader_request_pending = false;
static uint32_t bootloader_request_timer = 0;
static uint32_t bootloader_disable_mask = 0;

void keyboard_post_init_kb(void) {
    keyboard_post_init_user();
}

__attribute__((weak)) void raw_hid_receive_keymap(uint8_t *data, uint8_t length) {}

void raw_hid_receive(uint8_t *data, uint8_t length) {
    switch (data[0]) {
        case M11_HID_CMD_GET_INFO:
            // Response: [0x03, protocol, major, minor, patch, ...]
            memset(data, 0, length);
            data[0] = M11_HID_CMD_GET_INFO;
            data[1] = M11_HID_PROTOCOL_VERSION;
            data[2] = MACRO_ELEVEN_FW_VERSION_MAJOR;
            data[3] = MACRO_ELEVEN_FW_VERSION_MINOR;
            data[4] = MACRO_ELEVEN_FW_VERSION_PATCH;
            raw_hid_send(data, length);
            return;

        case M11_HID_CMD_ENTER_BOOTLOADER:
            if (memcmp(&data[1], "BOOT", 4) != 0) {
                return;
            }
            bootloader_disable_mask = (data[5] & M11_BOOTLOADER_FLAG_NO_MASS_STORAGE) ? RP2040_BOOTROM_DISABLE_MASS_STORAGE : 0;
            // Response: [0x04, 1]. The jump happens in housekeeping so this report is sent first.
            memset(data, 0, length);
            data[0] = M11_HID_CMD_ENTER_BOOTLOADER;
            data[1] = 1;
            raw_hid_send(data, length);
            bootloader_request_timer = timer_read32();
            bootloader_request_pending = true;
            return;
    }

    raw_hid_receive_keymap(data, length);
}

bool process_record_kb(uint16_t keycode, keyrecord_t *record) {
    if (!process_record_user(keycode, record)) {
        return false;
    }

    // Handle bootloader reset with 2-second hold (for QK_BOOT keycode if used elsewhere)
    if (keycode == QK_BOOT || keycode == QK_BOOTLOADER) {
        if (record->event.pressed) {
            bootloader_hold_timer = timer_read32();
            bootloader_hold_active = true;
        } else {
            bootloader_hold_active = false;
        }
        return false;
    }

    return true;
}

void housekeeping_task_kb(void) {
    housekeeping_task_user();

    // Companion app requested a firmware update
    if (bootloader_request_pending && timer_elapsed32(bootloader_request_timer) >= M11_BOOTLOADER_DELAY_MS) {
        clear_keyboard();
        reset_usb_boot(0, bootloader_disable_mask);
    }

    // Check for bootloader hold (2 seconds)
    if (bootloader_hold_active && timer_elapsed32(bootloader_hold_timer) >= 2000) {
        bootloader_hold_active = false;
        bootloader_jump();
    }
}
