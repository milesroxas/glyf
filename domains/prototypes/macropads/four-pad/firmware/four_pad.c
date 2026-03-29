// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include "quantum.h"
#include "i2c_lcd.h"
#include "i2c_scanner.h"
#include "wait.h"
#include <string.h>
#include <stdio.h>

static bool lcd_initialized = false;
static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;


// Layer names - customize these for your applications
// Index corresponds to layer number (0, 1, 2, etc.)
static const char* layer_names[] = {
    "App Select",  // Layer 0 - App selection layer
    "Chrome",      // Layer 1
    "Figma",       // Layer 2
    NULL,          // Layer 3 - not assigned yet
    NULL,          // Layer 4
    NULL,          // Layer 5
    NULL,          // Layer 6
    NULL,          // Layer 7
};

// Custom keycodes are defined in individual keymaps
// VIA keymap: BACK_HOME = QK_KB_0
// Apps keymap: APP_CHROME, APP_FIGMA, etc. start at SAFE_RANGE

// Custom macro labels - add your macro names here
// Index corresponds to macro number (M0, M1, M2, etc.)
static const char* macro_labels[] = {
    "Figma",   // M0
    "Chrome",  // M1
    NULL,      // M2 - not assigned yet
    NULL,      // M3
    NULL,      // M4
    NULL,      // M5
    NULL,      // M6
    NULL,      // M7
    NULL,      // M8
    NULL,      // M9
    NULL,      // M10
    NULL,      // M11
    NULL,      // M12
    NULL,      // M13
    NULL,      // M14
    NULL,      // M15
};

// Get a short name for a keycode (unused in apps keymap, kept for VIA keymap)
__attribute__((unused)) static void get_keycode_name(uint16_t keycode, char* buffer, size_t size) {
    // Check for modifier combinations
    if (keycode >= QK_MODS && keycode <= QK_MODS_MAX) {
        uint8_t mods = (keycode >> 8) & 0x1F;

        // Show modifier prefix
        if (mods & MOD_LCTL || mods & MOD_RCTL) {
            snprintf(buffer, size, "C-");
        } else if (mods & MOD_LALT || mods & MOD_RALT) {
            snprintf(buffer, size, "A-");
        } else if (mods & MOD_LGUI || mods & MOD_RGUI) {
            snprintf(buffer, size, "G-");
        } else if (mods & MOD_LSFT || mods & MOD_RSFT) {
            snprintf(buffer, size, "S-");
        }
        return;
    }

    switch (keycode) {
        case KC_1 ... KC_9:
            snprintf(buffer, size, "%c", '1' + (keycode - KC_1));
            break;
        case KC_0:
            snprintf(buffer, size, "0");
            break;
        case KC_A ... KC_Z:
            snprintf(buffer, size, "%c", 'A' + (keycode - KC_A));
            break;
        case KC_SPC:
            snprintf(buffer, size, "Spc");
            break;
        case KC_ENT:
            snprintf(buffer, size, "Ent");
            break;
        case KC_ESC:
            snprintf(buffer, size, "Esc");
            break;
        case KC_BSPC:
            snprintf(buffer, size, "Bsp");
            break;
        case KC_TAB:
            snprintf(buffer, size, "Tab");
            break;
        case KC_F1 ... KC_F12:
            snprintf(buffer, size, "F%d", (keycode - KC_F1) + 1);
            break;
        case KC_MPRV:
            snprintf(buffer, size, "Prv");
            break;
        case KC_MPLY:
            snprintf(buffer, size, "Ply");
            break;
        case KC_MNXT:
            snprintf(buffer, size, "Nxt");
            break;
        case KC_VOLD:
            snprintf(buffer, size, "V-");
            break;
        case KC_VOLU:
            snprintf(buffer, size, "V+");
            break;
        case KC_MUTE:
            snprintf(buffer, size, "Mut");
            break;
        case KC_TRNS:
            snprintf(buffer, size, "---");
            break;
        case QK_MOMENTARY ... QK_MOMENTARY_MAX:
            snprintf(buffer, size, "MO%d", keycode - QK_MOMENTARY);
            break;
        case QK_DEF_LAYER ... QK_DEF_LAYER_MAX:
            snprintf(buffer, size, "DF%d", keycode - QK_DEF_LAYER);
            break;
        case QK_TOGGLE_LAYER ... QK_TOGGLE_LAYER_MAX:
            snprintf(buffer, size, "TG%d", keycode - QK_TOGGLE_LAYER);
            break;
        case QK_ONE_SHOT_LAYER ... QK_ONE_SHOT_LAYER_MAX:
            snprintf(buffer, size, "OS%d", keycode - QK_ONE_SHOT_LAYER);
            break;
        case QK_LAYER_TAP ... QK_LAYER_TAP_MAX:
            snprintf(buffer, size, "LT%d", (keycode >> 8) & 0x1F);
            break;
        case QK_TO ... QK_TO_MAX:
            snprintf(buffer, size, "TO%d", keycode - QK_TO);
            break;
        default:
            // Custom keycodes (from keymaps) - show generic label
            if (keycode >= SAFE_RANGE) {
                snprintf(buffer, size, "##");  // Custom keycode indicator
            } else if (keycode >= QK_KB_0 && keycode <= QK_KB_31) {
                snprintf(buffer, size, "KB");  // QK_KB range
            } else if (keycode >= QK_MACRO && keycode <= QK_MACRO_MAX) {
                // VIA Macro - check if we have a custom label
                uint8_t macro_id = keycode - QK_MACRO;
                if (macro_id < 16 && macro_labels[macro_id] != NULL) {
                    snprintf(buffer, size, "%s", macro_labels[macro_id]);
                } else {
                    snprintf(buffer, size, "M%d", macro_id);
                }
            } else {
                snprintf(buffer, size, "???");
            }
            break;
    }
}

__attribute__((unused)) static void update_layer_display(void) {
    uint8_t current_layer = get_highest_layer(layer_state);
    i2c_lcd_clear();

    // Line 1: Layer name centered
    char line1[17];
    if (current_layer < 8 && layer_names[current_layer] != NULL) {
        snprintf(line1, sizeof(line1), "%s", layer_names[current_layer]);
    } else {
        snprintf(line1, sizeof(line1), "Layer %d", current_layer);
    }
    i2c_lcd_print(line1);

    // Line 2: Show layer number or helpful info
    char line2[17];
    if (current_layer == 0) {
        snprintf(line2, sizeof(line2), "Select an app");
    } else {
        snprintf(line2, sizeof(line2), "Layer %d", current_layer);
    }
    i2c_lcd_set_cursor(0, 1);
    i2c_lcd_print(line2);
}

void keyboard_post_init_kb(void) {
    // Wait for LCD power-up
    wait_ms(500);

    // Try to initialize LCD
    i2c_lcd_init();
    wait_ms(100);

    lcd_initialized = true;

    // Let the keymap initialize the display
    keyboard_post_init_user();
}

bool process_record_kb(uint16_t keycode, keyrecord_t *record) {
    if (!process_record_user(keycode, record)) {
        return false;
    }

    // Note: Custom keycodes are handled by the keymap's process_record_user
    // which is called at the beginning of this function

    // Handle bootloader reset with 2-second hold (for QK_BOOT keycode if used elsewhere)
    if (keycode == QK_BOOT || keycode == QK_BOOTLOADER) {
        if (record->event.pressed) {
            bootloader_hold_timer = timer_read32();
            bootloader_hold_active = true;

            i2c_lcd_clear();
            i2c_lcd_print("Hold for reset");
            i2c_lcd_set_cursor(0, 1);
            i2c_lcd_print("2 seconds...");
        } else {
            // Key released - cancel if not held long enough
            bootloader_hold_active = false;
            update_layer_display();
        }
        return false; // Don't process further
    }

    // Don't show keyboard-level feedback - let keymaps handle display
    // This allows keymaps to show custom information
    return true;
}

void housekeeping_task_kb(void) {
    // Let the keymap's housekeeping_task_user run first
    housekeeping_task_user();

    // Check for bootloader hold (2 seconds) - only if keymap didn't handle it
    if (bootloader_hold_active && timer_elapsed32(bootloader_hold_timer) >= 2000) {
        i2c_lcd_clear();
        i2c_lcd_print("Resetting to");
        i2c_lcd_set_cursor(0, 1);
        i2c_lcd_print("bootloader...");
        wait_ms(500);
        bootloader_jump();
    }

    // Don't update display automatically - let keymap control it
    // This allows keymaps to show custom information
}
