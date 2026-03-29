/**
 * ST7796S TFT display driver – RP2040 Pico SDK implementation
 *
 * Datasheet commands reference: ST7796S datasheet v1.0
 * SPI mode 0 (CPOL=0, CPHA=0), MSB first.
 */

#include "st7796s.h"
#include "../pinout.h"

#include "hardware/gpio.h"
#include "hardware/spi.h"
#include "hardware/pwm.h"
#include "pico/stdlib.h"

#include <string.h>

// ---------------------------------------------------------------------------
// ST7796S command bytes
// ---------------------------------------------------------------------------
#define CMD_NOP        0x00
#define CMD_SWRESET    0x01
#define CMD_SLPOUT     0x11
#define CMD_NORON      0x13
#define CMD_INVOFF     0x20
#define CMD_INVON      0x21
#define CMD_DISPOFF    0x28
#define CMD_DISPON     0x29
#define CMD_CASET      0x2A
#define CMD_RASET      0x2B
#define CMD_RAMWR      0x2C
#define CMD_MADCTL     0x36
#define CMD_COLMOD     0x3A
#define CMD_PGAMCTRL   0xE0
#define CMD_NGAMCTRL   0xE1
#define CMD_DOCA       0xE8

// MADCTL orientation bits
#define MADCTL_MY   0x80
#define MADCTL_MX   0x40
#define MADCTL_MV   0x20
#define MADCTL_BGR  0x08

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

static inline void cs_select(void) {
    gpio_put(PIN_TFT_CS, 0);
}

static inline void cs_deselect(void) {
    gpio_put(PIN_TFT_CS, 1);
}

static inline void dc_command(void) {
    gpio_put(PIN_TFT_DC, 0);
}

static inline void dc_data(void) {
    gpio_put(PIN_TFT_DC, 1);
}

static void write_cmd(uint8_t cmd) {
    dc_command();
    cs_select();
    spi_write_blocking(GLYF_SPI_PORT, &cmd, 1);
    cs_deselect();
}

static void write_data(const uint8_t *data, size_t len) {
    dc_data();
    cs_select();
    spi_write_blocking(GLYF_SPI_PORT, data, len);
    cs_deselect();
}

static void write_data_byte(uint8_t byte) {
    write_data(&byte, 1);
}

static void set_window(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    uint8_t buf[4];

    buf[0] = x0 >> 8; buf[1] = x0 & 0xFF;
    buf[2] = x1 >> 8; buf[3] = x1 & 0xFF;
    write_cmd(CMD_CASET);
    write_data(buf, 4);

    buf[0] = y0 >> 8; buf[1] = y0 & 0xFF;
    buf[2] = y1 >> 8; buf[3] = y1 & 0xFF;
    write_cmd(CMD_RASET);
    write_data(buf, 4);

    write_cmd(CMD_RAMWR);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

void st7796s_reset(void) {
    gpio_put(PIN_TFT_RST, 1);
    sleep_ms(10);
    gpio_put(PIN_TFT_RST, 0);
    sleep_ms(20);
    gpio_put(PIN_TFT_RST, 1);
    sleep_ms(150);
}

void st7796s_init(void) {
    // Configure SPI1 at TFT write speed
    spi_init(GLYF_SPI_PORT, TFT_SPI_BAUD);
    spi_set_format(GLYF_SPI_PORT, 8, SPI_CPOL_0, SPI_CPHA_0, SPI_MSB_FIRST);

    gpio_set_function(PIN_SPI_SCK,  GPIO_FUNC_SPI);
    gpio_set_function(PIN_SPI_MOSI, GPIO_FUNC_SPI);
    gpio_set_function(PIN_SPI_MISO, GPIO_FUNC_SPI);

    // Control pins
    gpio_init(PIN_TFT_CS);  gpio_set_dir(PIN_TFT_CS,  GPIO_OUT); gpio_put(PIN_TFT_CS,  1);
    gpio_init(PIN_TFT_DC);  gpio_set_dir(PIN_TFT_DC,  GPIO_OUT); gpio_put(PIN_TFT_DC,  1);
    gpio_init(PIN_TFT_RST); gpio_set_dir(PIN_TFT_RST, GPIO_OUT); gpio_put(PIN_TFT_RST, 1);

    // Backlight PWM on GP16 (PWM0A)
    gpio_set_function(PIN_TFT_BL, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(PIN_TFT_BL);
    pwm_set_wrap(slice, 255);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(PIN_TFT_BL), 0);
    pwm_set_enabled(slice, true);

    st7796s_reset();

    // Initialisation sequence (sleep-out → configure → display on)
    write_cmd(CMD_SWRESET); sleep_ms(120);
    write_cmd(CMD_SLPOUT);  sleep_ms(120);

    // COLMOD: 16-bit RGB565
    write_cmd(CMD_COLMOD); write_data_byte(0x55);

    // MADCTL: landscape, BGR
    write_cmd(CMD_MADCTL); write_data_byte(MADCTL_MX | MADCTL_BGR);

    // Inversion off, normal display on
    write_cmd(CMD_INVOFF);
    write_cmd(CMD_NORON);

    // Gamma tuning (typical values from reference design)
    static const uint8_t pgamma[] = {
        0xF0,0x09,0x13,0x12,0x12,0x2B,0x3C,0x44,
        0x4B,0x1B,0x18,0x17,0x1D,0x21
    };
    static const uint8_t ngamma[] = {
        0xF0,0x09,0x13,0x0C,0x0D,0x27,0x3B,0x44,
        0x4D,0x0B,0x17,0x17,0x1D,0x21
    };
    write_cmd(CMD_PGAMCTRL); write_data(pgamma, sizeof(pgamma));
    write_cmd(CMD_NGAMCTRL); write_data(ngamma, sizeof(ngamma));

    write_cmd(CMD_DISPON);
    st7796s_set_backlight(200);
}

void st7796s_set_orientation(st7796s_orientation_t orientation) {
    uint8_t madctl;
    switch (orientation) {
        case ST7796S_LANDSCAPE:
            madctl = MADCTL_MX | MADCTL_BGR; break;
        case ST7796S_PORTRAIT:
            madctl = MADCTL_MV | MADCTL_BGR; break;
        case ST7796S_LANDSCAPE_FLIP:
            madctl = MADCTL_MY | MADCTL_BGR; break;
        case ST7796S_PORTRAIT_FLIP:
            madctl = MADCTL_MX | MADCTL_MY | MADCTL_MV | MADCTL_BGR; break;
        default:
            madctl = MADCTL_MX | MADCTL_BGR; break;
    }
    write_cmd(CMD_MADCTL);
    write_data_byte(madctl);
}

void st7796s_set_backlight(uint8_t brightness) {
    uint slice = pwm_gpio_to_slice_num(PIN_TFT_BL);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(PIN_TFT_BL), brightness);
}

void st7796s_set_power(bool on) {
    write_cmd(on ? CMD_DISPON : CMD_DISPOFF);
}

void st7796s_fill(uint16_t color) {
    st7796s_fill_rect(0, 0, TFT_WIDTH, TFT_HEIGHT, color);
}

void st7796s_fill_rect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
    set_window(x, y, x + w - 1, y + h - 1);
    uint8_t hi = color >> 8;
    uint8_t lo = color & 0xFF;
    dc_data();
    cs_select();
    for (uint32_t i = 0; i < (uint32_t)w * h; i++) {
        spi_write_blocking(GLYF_SPI_PORT, &hi, 1);
        spi_write_blocking(GLYF_SPI_PORT, &lo, 1);
    }
    cs_deselect();
}

void st7796s_blit(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const uint16_t *buf) {
    set_window(x, y, x + w - 1, y + h - 1);
    dc_data();
    cs_select();
    // Swap byte order for each pixel (RGB565 big-endian on wire)
    for (uint32_t i = 0; i < (uint32_t)w * h; i++) {
        uint8_t hi = buf[i] >> 8;
        uint8_t lo = buf[i] & 0xFF;
        spi_write_blocking(GLYF_SPI_PORT, &hi, 1);
        spi_write_blocking(GLYF_SPI_PORT, &lo, 1);
    }
    cs_deselect();
}

void st7796s_set_pixel(uint16_t x, uint16_t y, uint16_t color) {
    st7796s_blit(x, y, 1, 1, &color);
}
