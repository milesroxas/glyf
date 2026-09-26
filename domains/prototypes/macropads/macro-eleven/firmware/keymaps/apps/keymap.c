// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H
#include "analog.h"
#include "raw_hid.h"

// Custom keycodes for app launching
enum custom_keycodes {
    APP_CHROME = SAFE_RANGE,
    APP_FIGMA,
    APP_VSCODE,
    APP_SLACK,
    APP_SPOTIFY,
    APP_TERMINAL,
    APP_MESSAGES,
    APP_NOTES,
    APP_MUSIC,
    APP_FINDER,
    BACK_HOME,
    FIGMA_DEPTH
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /*
     * Layer 0 (App Selection)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │Chrome │ Figma │       │  (no key at [0,3])
     * ├───────┼───────┼───────┼───────┤
     * │VSCode │ Slack │Spotify│ Term  │
     * ├───────┼───────┼───────┼───────┤
     * │ Msgs  │ Notes │ Music │Finder │
     * └───────┴───────┴───────┴───────┘
     */
    [0] = LAYOUT(
        BACK_HOME,   APP_CHROME,  APP_FIGMA,
        APP_VSCODE,  APP_SLACK,   APP_SPOTIFY, APP_TERMINAL,
        APP_MESSAGES,APP_NOTES,   APP_MUSIC,   APP_FINDER
    ),

    /*
     * Layer 1 (Chrome Shortcuts)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │NewTab │Close T│       │
     * ├───────┼───────┼───────┼───────┤
     * │Reopen │ Prev  │ Next  │DevTool│
     * ├───────┼───────┼───────┼───────┤
     * │Reload │ Back  │  Fwd  │Search │
     * └───────┴───────┴───────┴───────┘
     */
    [1] = LAYOUT(
        BACK_HOME,   LGUI(KC_T),        LGUI(KC_W),
        LGUI(LSFT(KC_T)),  LGUI(LSFT(KC_LBRC)), LGUI(LSFT(KC_RBRC)), LGUI(LALT(KC_I)),
        LGUI(KC_R),        LGUI(KC_LBRC),        LGUI(KC_RBRC),        LGUI(KC_L)
    ),

    /*
     * Layer 2 (Figma Shortcuts)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ Frame │ Text  │       │
     * ├───────┼───────┼───────┼───────┤
     * │ Rect  │  Pen  │Comment│ Zoom  │
     * ├───────┼───────┼───────┼───────┤
     * │ Depth │ZoomIn │ZoomOut│ Run   │
     * └───────┴───────┴───────┴───────┘
     */
    [2] = LAYOUT(
        BACK_HOME,   KC_F,        KC_T,
        KC_R,        KC_P,        KC_C,          LGUI(KC_0),
        FIGMA_DEPTH, LGUI(KC_EQL),LGUI(KC_MINS), LGUI(LALT(KC_P))
    ),

    /*
     * Layer 3 (VS Code Shortcuts)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ CmdP  │ Find  │       │
     * ├───────┼───────┼───────┼───────┤
     * │Replace│Comment│Format │ Term  │
     * ├───────┼───────┼───────┼───────┤
     * │ Save  │ Close │Reopen │CmdShP │
     * └───────┴───────┴───────┴───────┘
     */
    [3] = LAYOUT(
        BACK_HOME,   LGUI(KC_P),        LGUI(KC_F),
        LGUI(LALT(KC_F)),  LGUI(KC_SLSH),     LGUI(LSFT(KC_F)), LGUI(KC_J),
        LGUI(KC_S),        LGUI(KC_W),        LGUI(LSFT(KC_T)), LGUI(LSFT(KC_P))
    ),

    /*
     * Layer 4 (Slack Shortcuts)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │Search │  DMs  │       │
     * ├───────┼───────┼───────┼───────┤
     * │Thread │  All  │ Jump  │ Emoji │
     * ├───────┼───────┼───────┼───────┤
     * │ Edit  │ React │Upload │ Mark  │
     * └───────┴───────┴───────┴───────┘
     */
    [4] = LAYOUT(
        BACK_HOME,   LGUI(KC_K),          LGUI(LSFT(KC_K)),
        LGUI(LSFT(KC_T)),  LGUI(LSFT(KC_A)),    LGUI(KC_T),          LGUI(LSFT(KC_BSLS)),
        KC_UP,              LGUI(LSFT(KC_BSLS)), LGUI(KC_U),          LALT(LSFT(KC_M))
    ),

    /*
     * Layer 5 (Spotify / Media)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ Prev  │ Play  │       │
     * ├───────┼───────┼───────┼───────┤
     * │ Next  │ Vol-  │ Mute  │ Vol+  │
     * ├───────┼───────┼───────┼───────┤
     * │ Shuf  │ Rept  │ Like  │ Queue │
     * └───────┴───────┴───────┴───────┘
     */
    [5] = LAYOUT(
        BACK_HOME,   KC_MPRV,     KC_MPLY,
        KC_MNXT,     KC_VOLD,     KC_MUTE,     KC_VOLU,
        KC_NO,       KC_NO,       KC_NO,       KC_NO
    ),

    /*
     * Layer 6 (Terminal Shortcuts)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │NewTab │Close T│       │
     * ├───────┼───────┼───────┼───────┤
     * │ Clear │ Left  │ Right │Search │
     * ├───────┼───────┼───────┼───────┤
     * │ Split │SplitH │ Prev  │ Next  │
     * └───────┴───────┴───────┴───────┘
     */
    [6] = LAYOUT(
        BACK_HOME,   LGUI(KC_T),          LGUI(KC_W),
        LGUI(KC_K),        LGUI(LSFT(KC_LBRC)), LGUI(LSFT(KC_RBRC)), LGUI(KC_F),
        LGUI(KC_D),        LGUI(LSFT(KC_D)),    LGUI(LALT(KC_LEFT)),  LGUI(LALT(KC_RIGHT))
    ),

    /*
     * Layer 7 (Messages)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ New   │ Info  │       │
     * ├───────┼───────┼───────┼───────┤
     * │Delete │Search │ Pin   │Attach │
     * ├───────┼───────┼───────┼───────┤
     * │Tapbck │ Reply │ Emoji │  GIF  │
     * └───────┴───────┴───────┴───────┘
     */
    [7] = LAYOUT(
        BACK_HOME,   LGUI(KC_N),  LGUI(KC_I),
        KC_BSPC,     LGUI(KC_F),  KC_NO,       KC_NO,
        KC_NO,       KC_NO,       KC_NO,       KC_NO
    ),

    /*
     * Layer 8 (Notes)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ New   │ Find  │       │
     * ├───────┼───────┼───────┼───────┤
     * │Delete │ Bold  │Italic │ List  │
     * ├───────┼───────┼───────┼───────┤
     * │Checkg │ Table │ Title │  H1   │
     * └───────┴───────┴───────┴───────┘
     */
    [8] = LAYOUT(
        BACK_HOME,   LGUI(KC_N),  LGUI(KC_F),
        KC_BSPC,     LGUI(KC_B),  LGUI(KC_I),        LGUI(LSFT(KC_7)),
        LGUI(LSFT(KC_L)), KC_NO,  LGUI(LSFT(KC_T)),  LGUI(LALT(KC_1))
    ),

    /*
     * Layer 9 (Music)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │ Prev  │ Play  │       │
     * ├───────┼───────┼───────┼───────┤
     * │ Next  │ Vol-  │ Mute  │ Vol+  │
     * ├───────┼───────┼───────┼───────┤
     * │ Shuf  │ Rept  │ Like  │ Queue │
     * └───────┴───────┴───────┴───────┘
     */
    [9] = LAYOUT(
        BACK_HOME,   KC_MPRV,     KC_MPLY,
        KC_MNXT,     KC_VOLD,     KC_MUTE,     KC_VOLU,
        KC_NO,       KC_NO,       KC_NO,       KC_NO
    ),

    /*
     * Layer 10 (Finder)
     * ┌───────┬───────┬───────┬───────┐
     * │ HOME  │NewWin │ Close │       │
     * ├───────┼───────┼───────┼───────┤
     * │ Info  │Delete │NewFld │Search │
     * ├───────┼───────┼───────┼───────┤
     * │ View1 │ View2 │ View3 │ View4 │
     * └───────┴───────┴───────┴───────┘
     */
    [10] = LAYOUT(
        BACK_HOME,   LGUI(KC_N),        LGUI(KC_W),
        LGUI(KC_I),        LGUI(KC_BSPC),     LGUI(LSFT(KC_N)), LGUI(LALT(KC_F)),
        LGUI(KC_1),        LGUI(KC_2),        LGUI(KC_3),        LGUI(KC_4)
    )
};

// Timer for bootloader hold detection
static uint32_t bootloader_hold_timer = 0;
static bool bootloader_hold_active = false;

// Figma potentiometer state
static bool figma_depth_held = false;

// Test mode for companion app (disables all key actions)
static bool test_mode_active = true;

// Potentiometer. One raw RP2040 ADC read jumps by several counts, so the pot
// is sampled on a fixed period and smoothed with an integer moving average.
// Both the taps and the value sent to the app use the smoothed value.
#define POT_MAX 1023
#define POT_SAMPLE_MS 2
#define POT_EMA_SHIFT 3        // Average weight 1/8: ~16 ms time constant
#define POT_FRAC_BITS 4        // Filter state keeps 1/16-count precision
#define POT_END_DEADZONE 10    // Counts at each stop read as exactly 0 or POT_MAX
#define POT_REPORT_HYSTERESIS 2
#define POT_TAP_STEP 24        // Counts per tap: ~42 taps over the full turn

static int32_t  pot_filter = 0; // Smoothed reading << POT_FRAC_BITS
static uint16_t pot_value = 0;  // Calibrated 0-POT_MAX value
static uint16_t pot_tap_ref = 0;
static uint16_t pot_sample_timer = 0;
static bool     pot_ready = false;

// Map the smoothed reading to 0-POT_MAX so both stops reach the ends,
// despite the ADC offset and the pot's end resistance
static uint16_t pot_calibrate(int32_t filtered) {
    int32_t counts = (filtered + (1 << (POT_FRAC_BITS - 1))) >> POT_FRAC_BITS;
    if (counts <= POT_END_DEADZONE) return 0;
    if (counts >= POT_MAX - POT_END_DEADZONE) return POT_MAX;
    return (uint16_t)((counts - POT_END_DEADZONE) * POT_MAX / (POT_MAX - 2 * POT_END_DEADZONE));
}

static void pot_tap(bool clockwise, uint8_t layer) {
    if (layer == 0) {
        // App Selection: volume control
        tap_code(clockwise ? KC_VOLU : KC_VOLD);
    } else if (layer == 2) {
        // Figma: layer navigation
        if (figma_depth_held) {
            tap_code(clockwise ? KC_ENT : KC_BSLS);
        } else if (clockwise) {
            tap_code(KC_TAB);
        } else {
            tap_code16(LSFT(KC_TAB));
        }
    }
}

static void pot_task(void) {
    if (pot_ready && timer_elapsed(pot_sample_timer) < POT_SAMPLE_MS) return;
    pot_sample_timer = timer_read();

    int32_t sample = (int32_t)analogReadPin(POT_PIN) << POT_FRAC_BITS;
    if (!pot_ready) {
        // Start from the real position, not 0, so boot sends no tap
        pot_filter = sample;
        pot_value = pot_calibrate(pot_filter);
        pot_tap_ref = pot_value;
        pot_ready = true;
        return;
    }
    pot_filter += (sample - pot_filter) >> POT_EMA_SHIFT;

    // Hold the value until it moves 2 counts, so it does not flicker between
    // neighbors. The stops always report exactly.
    uint16_t next = pot_calibrate(pot_filter);
    if (next == 0 || next == POT_MAX || abs((int)next - (int)pot_value) >= POT_REPORT_HYSTERESIS) {
        pot_value = next;
    }

    // One tap per POT_TAP_STEP counts. The reference moves one step per tap,
    // so a fast turn sends every tap, one per sample. Taps still run in test
    // mode: the host engine has no knob action yet (audit FW-02).
    uint8_t layer = get_highest_layer(layer_state);
    if (layer != 0 && layer != 2) {
        pot_tap_ref = pot_value;
        return;
    }
    int16_t diff = (int16_t)pot_value - (int16_t)pot_tap_ref;
    if (diff >= POT_TAP_STEP) {
        pot_tap_ref += POT_TAP_STEP;
        pot_tap(true, layer);
    } else if (diff <= -POT_TAP_STEP) {
        pot_tap_ref -= POT_TAP_STEP;
        pot_tap(false, layer);
    }
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
}

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    // Block all key processing when test mode is active
    if (test_mode_active) {
        return false;
    }

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
            }
        }
        return false;
    }

    // Handle FIGMA_DEPTH hold key
    if (keycode == FIGMA_DEPTH) {
        figma_depth_held = record->event.pressed;
        return false;
    }

    // Handle app launch keycodes
    if (record->event.pressed) {
        switch (keycode) {
            case APP_CHROME:
                launch_app("Chrome", 1);
                return false;
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
            case APP_MESSAGES:
                launch_app("Messages", 7);
                return false;
            case APP_NOTES:
                launch_app("Notes", 8);
                return false;
            case APP_MUSIC:
                launch_app("Music", 9);
                return false;
            case APP_FINDER:
                launch_app("Finder", 10);
                return false;
        }
    }

    return true;
}

void keyboard_post_init_user(void) {
    // No LCD to initialize
}

// Check for bootloader hold (2 seconds)
void matrix_scan_user(void) {
    if (bootloader_hold_active) {
        uint32_t elapsed = timer_elapsed32(bootloader_hold_timer);

        if (elapsed >= 2000) {
            bootloader_hold_active = false;
            bootloader_jump();
        }
    }

    pot_task();
}

// Raw HID handler for companion app communication
// (system commands 0x03-0x04 are handled in macro_eleven.c)
// Request:  [0x01, ...] - poll state
//           [0x02, enable] - set test mode (0=disable, 1=enable)
// Response: [0x01, key_lo, key_hi, pot_lo, pot_hi, layer, test_mode, ...]
void raw_hid_receive_keymap(uint8_t *data, uint8_t length) {
    // Command 0x02: Set test mode
    if (data[0] == 0x02) {
        test_mode_active = data[1] != 0;
        // Send acknowledgment
        uint8_t response[32];
        memset(response, 0, 32);
        response[0] = 0x02;
        response[1] = test_mode_active ? 1 : 0;
        raw_hid_send(response, 32);
        return;
    }

    // Command 0x01: Poll state
    if (data[0] != 0x01) return;

    // Read 11-key matrix state as a bitmask
    // Layout order: [0,0] [0,1] [0,2] [1,0] [1,1] [1,2] [1,3] [2,0] [2,1] [2,2] [2,3]
    uint16_t key_bits = 0;
    static const uint8_t matrix_map[][2] = {
        {0,0}, {0,1}, {0,2},
        {1,0}, {1,1}, {1,2}, {1,3},
        {2,0}, {2,1}, {2,2}, {2,3}
    };
    for (uint8_t i = 0; i < 11; i++) {
        if (matrix_is_on(matrix_map[i][0], matrix_map[i][1])) {
            key_bits |= (1 << i);
        }
    }

    // Smoothed potentiometer value (pot_task)
    uint16_t pot = pot_value;

    // Read current layer
    uint8_t layer = get_highest_layer(layer_state);

    // Build response
    uint8_t response[32];
    memset(response, 0, 32);
    response[0] = 0x01;
    response[1] = key_bits & 0xFF;
    response[2] = (key_bits >> 8) & 0xFF;
    response[3] = pot & 0xFF;
    response[4] = (pot >> 8) & 0xFF;
    response[5] = layer;
    response[6] = test_mode_active ? 1 : 0;

    raw_hid_send(response, 32);
}
