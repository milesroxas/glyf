/**
 * ST7796S TFT display driver
 *
 * Supports:
 *  - Hardware SPI via SPI1 (see pinout.h)
 *  - 16-bit RGB565 colour mode
 *  - Landscape / portrait orientation
 *  - Hardware reset + backlight PWM
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

// ---------------------------------------------------------------------------
// Colour helpers (RGB565)
// ---------------------------------------------------------------------------
#define RGB565(r, g, b) \
    (uint16_t)(((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3))

#define COLOR_BLACK   RGB565(0,   0,   0)
#define COLOR_WHITE   RGB565(255, 255, 255)
#define COLOR_RED     RGB565(255, 0,   0)
#define COLOR_GREEN   RGB565(0,   255, 0)
#define COLOR_BLUE    RGB565(0,   0,   255)
#define COLOR_CYAN    RGB565(0,   255, 255)
#define COLOR_YELLOW  RGB565(255, 255, 0)

// ---------------------------------------------------------------------------
// Orientation
// ---------------------------------------------------------------------------
typedef enum {
    ST7796S_LANDSCAPE      = 0,  // Default: 480 wide, 320 tall
    ST7796S_PORTRAIT       = 1,  // 320 wide, 480 tall
    ST7796S_LANDSCAPE_FLIP = 2,
    ST7796S_PORTRAIT_FLIP  = 3,
} st7796s_orientation_t;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Initialise the ST7796S display.
 * Call once after SPI1 and GPIO are configured.
 */
void st7796s_init(void);

/**
 * Hard-reset the display controller.
 */
void st7796s_reset(void);

/**
 * Set orientation / MADCTL register.
 */
void st7796s_set_orientation(st7796s_orientation_t orientation);

/**
 * Set backlight brightness via PWM (0 = off, 255 = full).
 */
void st7796s_set_backlight(uint8_t brightness);

/**
 * Turn display on or off (DISPON / DISPOFF command).
 */
void st7796s_set_power(bool on);

/**
 * Fill entire screen with a single RGB565 colour.
 */
void st7796s_fill(uint16_t color);

/**
 * Draw a filled rectangle.
 */
void st7796s_fill_rect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);

/**
 * Write a pixel buffer (RGB565, row-major) into the given window.
 * @param buf   Pointer to pixel data (w * h * 2 bytes)
 */
void st7796s_blit(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const uint16_t *buf);

/**
 * Draw a single pixel.
 */
void st7796s_set_pixel(uint16_t x, uint16_t y, uint16_t color);
