// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H

// Custom keycode for Home key behavior (layer cycle + bootloader hold)
enum custom_keycodes {
    BACK_HOME = SAFE_RANGE
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (Numbers)
     * ┌───┬───┬───┬───┐
     * │Cyc│ 1 │ 2 │   │  (no key at [0,3])
     * ├───┼───┼───┼───┤
     * │ 3 │ 4 │ 5 │ 6 │
     * ├───┼───┼───┼───┤
     * │ 7 │ 8 │ 9 │ 0 │
     * └───┴───┴───┴───┘
     */
    [0] = LAYOUT(
        BACK_HOME, KC_1,    KC_2,
        KC_3,    KC_4,    KC_5,    KC_6,
        KC_7,    KC_8,    KC_9,    KC_0
    ),

    /*
     * Layer 1 (Function Keys)
     * ┌───┬───┬───┬───┐
     * │Cyc│ F1│ F2│   │
     * ├───┼───┼───┼───┤
     * │ F3│ F4│ F5│ F6│
     * ├───┼───┼───┼───┤
     * │ F7│ F8│ F9│F10│
     * └───┴───┴───┴───┘
     */
    [1] = LAYOUT(
        BACK_HOME, KC_F1,   KC_F2,
        KC_F3,   KC_F4,   KC_F5,   KC_F6,
        KC_F7,   KC_F8,   KC_F9,   KC_F10
    ),

    /*
     * Layer 2 (Media Controls)
     * ┌───┬───┬───┬───┐
     * │Cyc│Prv│Ply│   │
     * ├───┼───┼───┼───┤
     * │Nxt│V- │Mut│V+ │
     * ├───┼───┼───┼───┤
     * │   │   │   │   │
     * └───┴───┴───┴───┘
     */
    [2] = LAYOUT(
        BACK_HOME, KC_MPRV, KC_MPLY,
        KC_MNXT, KC_VOLD, KC_MUTE, KC_VOLU,
        KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS
    ),

    /*
     * Layer 3 (Shortcuts)
     * ┌───┬───┬───┬───┐
     * │Cyc│Cut│Cpy│   │
     * ├───┼───┼───┼───┤
     * │Pst│Und│Sav│Rdo│
     * ├───┼───┼───┼───┤
     * │   │   │   │   │
     * └───┴───┴───┴───┘
     */
    [3] = LAYOUT(
        BACK_HOME,     LGUI(KC_X), LGUI(KC_C),
        LGUI(KC_V),  LGUI(KC_Z), LGUI(KC_S), LGUI(LSFT(KC_Z)),
        KC_TRNS,     KC_TRNS,    KC_TRNS,    KC_TRNS
    )
};

// Timer state for bootloader hold detection
static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;
static bool bootloader_triggered = false;

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case BACK_HOME:
            if (record->event.pressed) {
                bootloader_hold_timer = timer_read32();
                bootloader_hold_active = true;
                bootloader_triggered = false;
            } else {
                bool triggered = bootloader_triggered;
                bootloader_hold_active = false;
                if (!triggered) {
                    // Cycle through layers 0-3 on tap
                    uint8_t current_layer = get_highest_layer(layer_state);
                    if (current_layer >= 3) {
                        layer_move(0);
                    } else {
                        layer_move(current_layer + 1);
                    }
                }
            }
            return false;
    }
    return true;
}

void matrix_scan_user(void) {
    if (bootloader_hold_active && timer_elapsed32(bootloader_hold_timer) >= 2000) {
        bootloader_hold_active = false;
        bootloader_triggered = true;
        bootloader_jump();
    }
}
