// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H

// Custom keycode for layer cycling
enum custom_keycodes {
    CYC_LAY = SAFE_RANGE
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (Numbers)
     * ┌───┬───┬───┐
     * │ 1 │ 2 │ 3 │
     * ├───┼───┼───┤
     * │ 4 │ 5 │ 6 │
     * ├───┴───┴───┤
     * │  Cycle    │
     * └───────────┘
     */
    [0] = LAYOUT(
        KC_1,    KC_2,    KC_3,
        KC_4,    KC_5,    KC_6,
        CYC_LAY
    ),
    
    /*
     * Layer 1 (Function Keys)
     * ┌───┬───┬───┐
     * │ F1│ F2│ F3│
     * ├───┼───┼───┤
     * │ F4│ F5│ F6│
     * ├───┴───┴───┤
     * │  Cycle    │
     * └───────────┘
     */
    [1] = LAYOUT(
        KC_F1,   KC_F2,   KC_F3,
        KC_F4,   KC_F5,   KC_F6,
        CYC_LAY
    ),
    
    /*
     * Layer 2 (Media Controls)
     * ┌───┬───┬───┐
     * │Prv│Ply│Nxt│
     * ├───┼───┼───┤
     * │V- │Mut│V+ │
     * ├───┴───┴───┤
     * │  Cycle    │
     * └───────────┘
     */
    [2] = LAYOUT(
        KC_MPRV, KC_MPLY, KC_MNXT,
        KC_VOLD, KC_MUTE, KC_VOLU,
        CYC_LAY
    ),
    
    /*
     * Layer 3 (Shortcuts)
     * ┌───┬───┬───┐
     * │Cut│Cpy│Pst│
     * ├───┼───┼───┤
     * │Und│Sav│Rdo│
     * ├───┴───┴───┤
     * │  Cycle    │
     * └───────────┘
     */
    [3] = LAYOUT(
        LCTL(KC_X), LCTL(KC_C), LCTL(KC_V),
        LCTL(KC_Z), LCTL(KC_S), LCTL(KC_Y),
        CYC_LAY
    )
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case CYC_LAY:
            if (record->event.pressed) {
                // Cycle through layers 0-3
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
