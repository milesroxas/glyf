// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

// Debounce reduces chatter (5ms is default)
#define DEBOUNCE 5

// VIA Configuration
#define DYNAMIC_KEYMAP_LAYER_COUNT 4
#define DYNAMIC_KEYMAP_MACRO_COUNT 16

// Potentiometer ADC
#define POT_PIN GP26

// Bootmagic key = top-left (position [0,2] after column reversal)
#define BOOTMAGIC_ROW 0
#define BOOTMAGIC_COLUMN 2
