// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H
#include "i2c_lcd.h"

// Custom keycodes for app launching
enum custom_keycodes {
    APP_CHROME = SAFE_RANGE,
    APP_FIGMA,
    APP_VSCODE,
    APP_SLACK,
    APP_SPOTIFY,
    APP_TERMINAL,
    BACK_HOME
};

// Button labels for each layer (shown on LCD)
// Format: 6 labels for keys 1-6, key 7 is always "Home"
static const char* button_labels[][6] = {
    // Layer 0 - App Selection
    {"Chrome", "Figma", "VSCode", "Slack", "Spotify", "Term"},

    // Layer 1 - Chrome
    {"NewTab", "Close", "Reopen", "Prev", "Next", "DevTool"},

    // Layer 2 - Figma
    {"Frame", "Text", "Rect", "Pen", "Comment", "Zoom"},

    // Layer 3 - VS Code
    {"CmdP", "Find", "Replace", "Comment", "Format", "Term"},

    // Layer 4 - Slack
    {"Search", "DMs", "Thread", "All", "Jump", "Emoji"},

    // Layer 5 - Spotify
    {"Prev", "Play", "Next", "Vol-", "Mute", "Vol+"},

    // Layer 6 - Terminal
    {"NewTab", "Close", "Clear", "Left", "Right", "Search"},
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (App Selection)
     * ┌───────┬───────┬───────┐
     * │Chrome │ Figma │VSCode │
     * ├───────┼───────┼───────┤
     * │ Slack │Spotify│Terminal│
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [0] = LAYOUT(
        APP_CHROME,  APP_FIGMA,   APP_VSCODE,
        APP_SLACK,   APP_SPOTIFY, APP_TERMINAL,
        BACK_HOME
    ),

    /*
     * Layer 1 (Chrome Shortcuts)
     * ┌───────┬───────┬───────┐
     * │New Tab│Close T│Reopen │
     * ├───────┼───────┼───────┤
     * │ Prev  │ Next  │DevTool│
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [1] = LAYOUT(
        LGUI(KC_T),        LGUI(KC_W),        LGUI(LSFT(KC_T)),
        LGUI(LSFT(KC_LBRC)), LGUI(LSFT(KC_RBRC)), LGUI(LALT(KC_I)),
        BACK_HOME
    ),

    /*
     * Layer 2 (Figma Shortcuts)
     * ┌───────┬───────┬───────┐
     * │ Frame │ Text  │ Rect  │
     * ├───────┼───────┼───────┤
     * │ Pen   │Comment│ Zoom  │
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [2] = LAYOUT(
        KC_F,      KC_T,      KC_R,
        KC_P,      KC_C,      LGUI(KC_0),
        BACK_HOME
    ),

    /*
     * Layer 3 (VS Code Shortcuts)
     * ┌───────┬───────┬───────┐
     * │ Cmd P │ Find  │Replace│
     * ├───────┼───────┼───────┤
     * │Comment│Format │Terminal│
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [3] = LAYOUT(
        LGUI(KC_P),   LGUI(KC_F),   LGUI(LALT(KC_F)),
        LGUI(KC_SLSH), LGUI(LSFT(KC_F)), LGUI(KC_J),
        BACK_HOME
    ),

    /*
     * Layer 4 (Slack Shortcuts)
     * ┌───────┬───────┬───────┐
     * │Search │ DMs   │Thread │
     * ├───────┼───────┼───────┤
     * │ All   │ Jump  │ Emoji │
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [4] = LAYOUT(
        LGUI(KC_K),   LGUI(LSFT(KC_K)), LGUI(LSFT(KC_T)),
        LGUI(LSFT(KC_A)), LGUI(KC_T),   LGUI(LSFT(KC_BSLS)),
        BACK_HOME
    ),

    /*
     * Layer 5 (Spotify Shortcuts)
     * ┌───────┬───────┬───────┐
     * │ Prev  │ Play  │ Next  │
     * ├───────┼───────┼───────┤
     * │ Vol-  │ Mute  │ Vol+  │
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [5] = LAYOUT(
        KC_MPRV,  KC_MPLY,  KC_MNXT,
        KC_VOLD,  KC_MUTE,  KC_VOLU,
        BACK_HOME
    ),

    /*
     * Layer 6 (Terminal Shortcuts)
     * ┌───────┬───────┬───────┐
     * │New Tab│Close T│ Clear │
     * ├───────┼───────┼───────┤
     * │ Left  │ Right │Search │
     * ├───────┴───────┴───────┤
     * │      Home/Boot        │
     * └───────────────────────┘
     */
    [6] = LAYOUT(
        LGUI(KC_T),   LGUI(KC_W),   LGUI(KC_K),
        LGUI(LSFT(KC_LBRC)), LGUI(LSFT(KC_RBRC)), LGUI(KC_F),
        BACK_HOME
    )
};

// Timer for bootloader hold detection
static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;

// Display current layer's button labels
void update_button_display(void) {
    uint8_t current_layer = get_highest_layer(layer_state);

    // Don't show for layers beyond our definitions
    if (current_layer > 6) return;

    i2c_lcd_clear();

    // Line 1: Buttons 1-3 (4 chars + space = 15 chars total)
    char line1[17];
    snprintf(line1, sizeof(line1), "%.4s %.4s %.4s",
             button_labels[current_layer][0],
             button_labels[current_layer][1],
             button_labels[current_layer][2]);
    i2c_lcd_print(line1);

    // Line 2: Buttons 4-5 + Home (4 + space + 4 + space + 4 = 14 chars)
    char line2[17];
    snprintf(line2, sizeof(line2), "%.4s %.4s Home",
             button_labels[current_layer][3],
             button_labels[current_layer][4]);
    i2c_lcd_set_cursor(0, 1);
    i2c_lcd_print(line2);
}

// Function to launch app via Spotlight and switch to layer
void launch_app(const char* app_name, uint8_t target_layer) {
    // Open Spotlight (Cmd+Space)
    tap_code16(LGUI(KC_SPC));
    wait_ms(500);

    // Type the app name
    send_string(app_name);
    wait_ms(400);

    // Press Enter to launch
    tap_code(KC_ENT);

    // Switch to the app's layer
    layer_clear();
    layer_on(target_layer);

    // Update display to show new layer's buttons
    wait_ms(100);
    update_button_display();
}

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    // Handle BACK_HOME: tap to return to Layer 0, hold 2s for bootloader
    if (keycode == BACK_HOME) {
        if (record->event.pressed) {
            bootloader_hold_timer = timer_read32();
            bootloader_hold_active = true;
        } else {
            // Key released - if not held long enough, return to Layer 0
            if (bootloader_hold_active) {
                bootloader_hold_active = false;
                layer_clear();
                layer_on(0);

                // Update display to show Layer 0
                wait_ms(100);
                update_button_display();
            }
        }
        return false;
    }

    // Handle app launch keycodes
    if (record->event.pressed) {
        switch (keycode) {
            case APP_CHROME:
                launch_app("Chrome", 1);
                return false;  // Don't let keyboard code process this

            case APP_FIGMA:
                launch_app("Figma", 2);
                return false;

            case APP_VSCODE:
                launch_app("Visual Studio Code", 3);
                return false;

            case APP_SLACK:
                launch_app("Slack", 4);
                return false;

            case APP_SPOTIFY:
                launch_app("Spotify", 5);
                return false;

            case APP_TERMINAL:
                launch_app("Terminal", 6);
                return false;
        }
    }

    // For any other keycodes, let keyboard handle them
    return true;
}

// Initialize display on startup
void keyboard_post_init_user(void) {
    wait_ms(1000);  // Wait for LCD to be ready
    update_button_display();
}

// Check for bootloader hold (2 seconds)
void matrix_scan_user(void) {
    // Show countdown for bootloader reset
    if (bootloader_hold_active) {
        uint32_t elapsed = timer_elapsed32(bootloader_hold_timer);

        if (elapsed >= 2000) {
            i2c_lcd_clear();
            i2c_lcd_print("Resetting to");
            i2c_lcd_set_cursor(0, 1);
            i2c_lcd_print("bootloader...");
            bootloader_hold_active = false;
            wait_ms(500);
            bootloader_jump();
        } else if (elapsed >= 1000) {
            // After 1 second, show progress
            i2c_lcd_clear();
            i2c_lcd_print("Hold for reset");
            i2c_lcd_set_cursor(0, 1);
            i2c_lcd_print("1 second...");
        } else {
            // First second
            i2c_lcd_clear();
            i2c_lcd_print("Hold for reset");
            i2c_lcd_set_cursor(0, 1);
            i2c_lcd_print("2 seconds...");
        }
    }
}
