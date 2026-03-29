// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

// Debounce reduces chatter (5ms is default)
#define DEBOUNCE 5

// VIA Configuration
#define DYNAMIC_KEYMAP_LAYER_COUNT 4
#define DYNAMIC_KEYMAP_MACRO_COUNT 16

// I2C Configuration for LCD1602
#define I2C_DRIVER I2CD1
#define I2C1_SDA_PIN GP14
#define I2C1_SCL_PIN GP15

// LCD1602 I2C Configuration
#define LCD_I2C_ADDRESS 0x27  // Changed from 0x3F to 0x27
