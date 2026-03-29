// Copyright 2026 QMK
// SPDX-License-Identifier: GPL-2.0-or-later

#include "i2c_lcd.h"
#include "i2c_master.h"
#include "wait.h"
#include <string.h>

#ifndef LCD_I2C_ADDRESS
#    define LCD_I2C_ADDRESS 0x27
#endif

// LCD commands
#define LCD_CLEARDISPLAY 0x01
#define LCD_RETURNHOME 0x02
#define LCD_ENTRYMODESET 0x04
#define LCD_DISPLAYCONTROL 0x08
#define LCD_CURSORSHIFT 0x10
#define LCD_FUNCTIONSET 0x20
#define LCD_SETCGRAMADDR 0x40
#define LCD_SETDDRAMADDR 0x80

// Flags for display entry mode
#define LCD_ENTRYRIGHT 0x00
#define LCD_ENTRYLEFT 0x02
#define LCD_ENTRYSHIFTINCREMENT 0x01
#define LCD_ENTRYSHIFTDECREMENT 0x00

// Flags for display on/off control
#define LCD_DISPLAYON 0x04
#define LCD_DISPLAYOFF 0x00
#define LCD_CURSORON 0x02
#define LCD_CURSOROFF 0x00
#define LCD_BLINKON 0x01
#define LCD_BLINKOFF 0x00

// Flags for function set
#define LCD_8BITMODE 0x10
#define LCD_4BITMODE 0x00
#define LCD_2LINE 0x08
#define LCD_1LINE 0x00
#define LCD_5x10DOTS 0x04
#define LCD_5x8DOTS 0x00

// Flags for backlight control
#define LCD_BACKLIGHT 0x08
#define LCD_NOBACKLIGHT 0x00

#define En 0x04  // Enable bit
#define Rw 0x02  // Read/Write bit
#define Rs 0x01  // Register select bit

static uint8_t _displayfunction;
static uint8_t _displaycontrol;
static uint8_t _displaymode;
static uint8_t _backlightval = LCD_BACKLIGHT;

static void expanderWrite(uint8_t data) {
    uint8_t buf[1] = {data | _backlightval};
    i2c_transmit((LCD_I2C_ADDRESS << 1), buf, 1, 100);
    wait_us(50);  // Small delay after I2C transmission
}

static void pulseEnable(uint8_t data) {
    expanderWrite(data | En);
    wait_us(1);
    expanderWrite(data & ~En);
    wait_us(50);
}

static void write4bits(uint8_t value) {
    expanderWrite(value);
    pulseEnable(value);
}

static void send(uint8_t value, uint8_t mode) {
    uint8_t highnib = value & 0xF0;
    uint8_t lownib = (value << 4) & 0xF0;
    write4bits(highnib | mode);
    write4bits(lownib | mode);
}

static void command(uint8_t value) {
    send(value, 0);
}

static void write_data(uint8_t value) {
    send(value, Rs);
}

void i2c_lcd_init(void) {
    i2c_init();

    // Wait for LCD power-up (needs >40ms after VCC reaches 4.5V)
    wait_ms(100);

    _displayfunction = LCD_4BITMODE | LCD_2LINE | LCD_5x8DOTS;
    _backlightval = LCD_BACKLIGHT;

    // Put LCD into 4-bit mode - this is according to the Hitachi HD44780 datasheet
    // Figure 24, pg 46

    // We start in 8bit mode, try to set 4 bit mode
    write4bits(0x03 << 4);
    wait_ms(5);  // wait min 4.1ms

    // Second try
    write4bits(0x03 << 4);
    wait_ms(5);  // wait min 4.1ms

    // Third go!
    write4bits(0x03 << 4);
    wait_us(150);

    // Finally, set to 4-bit interface
    write4bits(0x02 << 4);
    wait_us(150);

    // Set # lines, font size, etc.
    command(LCD_FUNCTIONSET | _displayfunction);
    wait_us(60);

    // Turn the display on with no cursor or blinking default
    _displaycontrol = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF;
    command(LCD_DISPLAYCONTROL | _displaycontrol);
    wait_us(60);

    // Clear it off
    command(LCD_CLEARDISPLAY);
    wait_ms(3);  // This command takes a long time!

    // Initialize to default text direction (for roman languages)
    _displaymode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT;
    command(LCD_ENTRYMODESET | _displaymode);
    wait_us(60);
}

void i2c_lcd_clear(void) {
    command(LCD_CLEARDISPLAY);
    wait_ms(3);  // Clear command takes a long time
}

void i2c_lcd_set_cursor(uint8_t col, uint8_t row) {
    static const uint8_t row_offsets[] = {0x00, 0x40, 0x14, 0x54};
    if (row > 1) {
        row = 1;
    }
    command(LCD_SETDDRAMADDR | (col + row_offsets[row]));
}

void i2c_lcd_print(const char* str) {
    while (*str) {
        write_data(*str++);
    }
}

void i2c_lcd_putc(char c) {
    write_data(c);
}
