/**
 * XPT2046 resistive touch controller – RP2040 Pico SDK implementation
 *
 * XPT2046 command byte:
 *  Bit 7   : Start (always 1)
 *  Bit 6:4 : Channel select  (001=Y, 101=Z1, 110=Z2, 011=X)
 *  Bit 3   : Mode (0=12-bit, 1=8-bit)
 *  Bit 2   : SER/DFR (0=differential, 1=single-ended)
 *  Bit 1:0 : Power-down (00=power-down between conv.)
 */

#include "xpt2046.h"
#include "../pinout.h"

#include "hardware/gpio.h"
#include "hardware/spi.h"
#include "pico/stdlib.h"

#define CMD_READ_X   0xD0  // Start | CH=X | 12-bit | differential | power-down
#define CMD_READ_Y   0x90  // Start | CH=Y
#define CMD_READ_Z1  0xB0  // Start | CH=Z1
#define CMD_READ_Z2  0xC0  // Start | CH=Z2

#define PRESSURE_THRESHOLD 100

xpt2046_cal_t g_touch_cal = {
    .x_min    = 200,
    .x_max    = 3900,
    .y_min    = 200,
    .y_max    = 3900,
    .swap_axes = false,
    .invert_x  = false,
    .invert_y  = false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static inline void tch_cs_select(void) {
    gpio_put(PIN_TCH_CS, 0);
}

static inline void tch_cs_deselect(void) {
    gpio_put(PIN_TCH_CS, 1);
}

static uint16_t read_channel(uint8_t cmd) {
    // Switch to slower baud for touch read
    spi_set_baudrate(GLYF_SPI_PORT, TCH_SPI_BAUD);

    uint8_t tx[3] = { cmd, 0x00, 0x00 };
    uint8_t rx[3] = { 0 };

    tch_cs_select();
    spi_write_read_blocking(GLYF_SPI_PORT, tx, rx, 3);
    tch_cs_deselect();

    // Restore display baud
    spi_set_baudrate(GLYF_SPI_PORT, TFT_SPI_BAUD);

    // 12-bit result in bits [14:3] of the 24-bit response
    return ((uint16_t)(rx[1] << 8 | rx[2]) >> 3) & 0x0FFF;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

void xpt2046_init(void) {
    gpio_init(PIN_TCH_CS);
    gpio_set_dir(PIN_TCH_CS, GPIO_OUT);
    gpio_put(PIN_TCH_CS, 1);

    gpio_init(PIN_TCH_IRQ);
    gpio_set_dir(PIN_TCH_IRQ, GPIO_IN);
    gpio_pull_up(PIN_TCH_IRQ);
}

bool xpt2046_is_pressed(void) {
    return gpio_get(PIN_TCH_IRQ) == 0;
}

xpt2046_raw_t xpt2046_read_raw(void) {
    xpt2046_raw_t raw = { 0 };
    if (!xpt2046_is_pressed()) {
        return raw;
    }
    raw.raw_x  = read_channel(CMD_READ_X);
    raw.raw_y  = read_channel(CMD_READ_Y);
    raw.raw_z  = read_channel(CMD_READ_Z1);
    return raw;
}

xpt2046_point_t xpt2046_read(const xpt2046_cal_t *cal) {
    const xpt2046_cal_t *c = (cal != NULL) ? cal : &g_touch_cal;
    xpt2046_point_t pt = { 0 };

    if (!xpt2046_is_pressed()) {
        return pt;
    }

    xpt2046_raw_t raw = xpt2046_read_raw();

    if (raw.raw_z < PRESSURE_THRESHOLD) {
        return pt;
    }

    uint16_t rx = c->swap_axes ? raw.raw_y : raw.raw_x;
    uint16_t ry = c->swap_axes ? raw.raw_x : raw.raw_y;

    if (c->invert_x) rx = 4095 - rx;
    if (c->invert_y) ry = 4095 - ry;

    // Clamp to calibrated range
    if (rx < c->x_min) rx = c->x_min;
    if (rx > c->x_max) rx = c->x_max;
    if (ry < c->y_min) ry = c->y_min;
    if (ry > c->y_max) ry = c->y_max;

    pt.x = (uint16_t)((uint32_t)(rx - c->x_min) * (TFT_WIDTH  - 1) / (c->x_max - c->x_min));
    pt.y = (uint16_t)((uint32_t)(ry - c->y_min) * (TFT_HEIGHT - 1) / (c->y_max - c->y_min));
    pt.pressure = (float)raw.raw_z / 4095.0f;
    pt.pressed  = true;

    return pt;
}
