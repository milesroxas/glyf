// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

#include "quantum.h"

// Raw HID system commands, handled at keyboard level so every keymap supports
// firmware updates from the companion app. Keymap commands use 0x01-0x02.
#define M11_HID_CMD_GET_INFO 0x03
#define M11_HID_CMD_ENTER_BOOTLOADER 0x04

// Keymaps handle their own Raw HID commands here instead of raw_hid_receive().
void raw_hid_receive_keymap(uint8_t *data, uint8_t length);
