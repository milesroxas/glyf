// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H

// Custom keycode for layer cycling
enum custom_keycodes {
    CYC_LAY = SAFE_RANGE
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (Default)
     * ┌───┬───┬───┬───┐
     * │Cyc│ 1 │ 2 │   │  (no key at [0,3])
     * ├───┼───┼───┼───┤
     * │ 3 │ 4 │ 5 │ 6 │
     * ├───┼───┼───┼───┤
     * │ 7 │ 8 │ 9 │ 0 │
     * └───┴───┴───┴───┘
     */
    [0] = LAYOUT(
        CYC_LAY, KC_1,    KC_2,
        KC_3,    KC_4,    KC_5,    KC_6,
        KC_7,    KC_8,    KC_9,    KC_0
    ),

    /*
     * Layer 1
     * ┌───┬───┬───┬───┐
     * │   │ F1│ F2│   │
     * ├───┼───┼───┼───┤
     * │ F3│ F4│ F5│ F6│
     * ├───┼───┼───┼───┤
     * │ F7│ F8│ F9│F10│
     * └───┴───┴───┴───┘
     */
    [1] = LAYOUT(
        KC_TRNS, KC_F1,   KC_F2,
        KC_F3,   KC_F4,   KC_F5,   KC_F6,
        KC_F7,   KC_F8,   KC_F9,   KC_F10
    ),

    /*
     * Layer 2
     */
    [2] = LAYOUT(
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS
    ),

    /*
     * Layer 3
     */
    [3] = LAYOUT(
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS
    )
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case CYC_LAY:
            if (record->event.pressed) {
                uint8_t current_layer = get_highest_layer(layer_state);
                if (current_layer >= 3) {
                    layer_move(0);
                } else {
                    layer_move(current_layer + 1);
                }
            }
            return false;
    }
    return true;
}
