// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (Default)
     * ┌───┬───┬───┐
     * │ 1 │ 2 │ 3 │
     * ├───┼───┼───┤
     * │ 4 │ 5 │ 6 │
     * ├───┴───┴───┤
     * │   MO(1)    │
     * └───────────┘
     */
    [0] = LAYOUT(
        KC_1,    KC_2,    KC_3,
        KC_4,    KC_5,    KC_6,
        MO(1)
    ),
    
    /*
     * Layer 1
     * ┌───┬───┬───┐
     * │ F1│ F2│ F3│
     * ├───┼───┼───┤
     * │ F4│ F5│ F6│
     * ├───┴───┴───┤
     * │    ---    │
     * └───────────┘
     */
    [1] = LAYOUT(
        KC_F1,   KC_F2,   KC_F3,
        KC_F4,   KC_F5,   KC_F6,
        KC_TRNS
    ),
    
    /*
     * Layer 2
     * ┌───┬───┬───┐
     * │   │   │   │
     * ├───┼───┼───┤
     * │   │   │   │
     * ├───┴───┴───┤
     * │    ---    │
     * └───────────┘
     */
    [2] = LAYOUT(
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS
    ),
    
    /*
     * Layer 3
     * ┌───┬───┬───┐
     * │   │   │   │
     * ├───┼───┼───┤
     * │   │   │   │
     * ├───┴───┴───┤
     * │    ---    │
     * └───────────┘
     */
    [3] = LAYOUT(
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS, KC_TRNS, KC_TRNS,
        KC_TRNS
    )
};
