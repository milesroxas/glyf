// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include "quantum.h"

static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;

void keyboard_post_init_kb(void) {
    keyboard_post_init_user();
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

    // Check for bootloader hold (2 seconds)
    if (bootloader_hold_active && timer_elapsed32(bootloader_hold_timer) >= 2000) {
        bootloader_hold_active = false;
        bootloader_jump();
    }
}
