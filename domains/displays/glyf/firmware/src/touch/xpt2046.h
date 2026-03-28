/**
 * XPT2046 resistive touch controller driver
 *
 * Uses the shared SPI1 bus.  Before every read the SPI baud rate is
 * temporarily lowered to TCH_SPI_BAUD (2 MHz) and restored afterwards so
 * display and touch share the same peripheral safely.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef struct {
    uint16_t raw_x;   // 12-bit ADC, 0–4095
    uint16_t raw_y;
    uint16_t raw_z;   // pressure
} xpt2046_raw_t;

typedef struct {
    uint16_t x;       // mapped to display pixels (0–479)
    uint16_t y;       // mapped to display pixels (0–319)
    float    pressure; // 0.0–1.0
    bool     pressed;
} xpt2046_point_t;

// Calibration coefficients (adjust per physical unit)
typedef struct {
    uint16_t x_min;
    uint16_t x_max;
    uint16_t y_min;
    uint16_t y_max;
    bool     swap_axes;
    bool     invert_x;
    bool     invert_y;
} xpt2046_cal_t;

extern xpt2046_cal_t g_touch_cal;

/**
 * Initialise XPT2046 CS and IRQ pins.
 * Must be called after SPI1 is already initialised by st7796s_init().
 */
void xpt2046_init(void);

/**
 * Read raw ADC values directly from the controller.
 */
xpt2046_raw_t xpt2046_read_raw(void);

/**
 * Return a calibrated, display-mapped touch point.
 * @param cal  Calibration to apply; pass NULL to use g_touch_cal.
 */
xpt2046_point_t xpt2046_read(const xpt2046_cal_t *cal);

/**
 * Non-blocking: returns true if the IRQ line is asserted (touch present).
 */
bool xpt2046_is_pressed(void);
