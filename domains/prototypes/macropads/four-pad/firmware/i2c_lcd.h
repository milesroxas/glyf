// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

#include <stdint.h>
#include <stdbool.h>

// Initialize the LCD
void i2c_lcd_init(void);

// Clear the display
void i2c_lcd_clear(void);

// Set cursor position (col, row)
void i2c_lcd_set_cursor(uint8_t col, uint8_t row);

// Print a string
void i2c_lcd_print(const char* str);

// Print a single character
void i2c_lcd_putc(char c);
