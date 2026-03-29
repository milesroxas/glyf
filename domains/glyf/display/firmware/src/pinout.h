/**
 * glyf – GPIO Pinout
 *
 * MCU   : RP2040 (Raspberry Pi Pico)
 * Display : ST7796S 4.0" SPI TFT 480×320
 * Touch   : XPT2046 resistive touch controller
 *
 * All display and touch signals share SPI1 (hardware-accelerated).
 * CS lines are kept separate so both peripherals can coexist on the bus.
 *
 * ┌──────────────┬────────┬──────────────────────────────────────────────┐
 * │ Signal       │ GPIO   │ Notes                                        │
 * ├──────────────┼────────┼──────────────────────────────────────────────┤
 * │ SPI1_SCK     │ GP10   │ Shared SPI1 clock (display + touch)          │
 * │ SPI1_MOSI    │ GP11   │ Shared SPI1 TX  (display + touch)            │
 * │ SPI1_MISO    │ GP12   │ Shared SPI1 RX  (touch read-back)            │
 * │ TFT_CS       │ GP13   │ Display chip-select  (active LOW)            │
 * │ TFT_DC       │ GP14   │ Display Data / Command  (HIGH=data)          │
 * │ TFT_RST      │ GP15   │ Display hard reset  (active LOW)             │
 * │ TFT_BL       │ GP16   │ Backlight PWM  (PWM0A, active HIGH)          │
 * │ TCH_CS       │ GP17   │ Touch chip-select  (active LOW)              │
 * │ TCH_IRQ      │ GP18   │ Touch interrupt  (active LOW, pulled up)     │
 * ├──────────────┼────────┼──────────────────────────────────────────────┤
 * │ (reserved)   │ GP0–9  │ Available for buttons / I²C / UART           │
 * │ (reserved)   │ GP19–25│ Available for LEDs / encoders                │
 * │ (ADC)        │ GP26–28│ Available for analogue sensors               │
 * └──────────────┴────────┴──────────────────────────────────────────────┘
 *
 * SPI clock: 40 MHz for display writes, 2 MHz for XPT2046 touch reads.
 */

#pragma once

#include "hardware/spi.h"

// ---------------------------------------------------------------------------
// SPI peripheral
// ---------------------------------------------------------------------------
#define GLYF_SPI_PORT  spi1

// ---------------------------------------------------------------------------
// Shared SPI bus
// ---------------------------------------------------------------------------
#define PIN_SPI_SCK    10u  // GP10 – SPI1 clock
#define PIN_SPI_MOSI   11u  // GP11 – SPI1 TX (MOSI)
#define PIN_SPI_MISO   12u  // GP12 – SPI1 RX (MISO)

// ---------------------------------------------------------------------------
// ST7796S display
// ---------------------------------------------------------------------------
#define PIN_TFT_CS     13u  // GP13 – chip select  (active LOW)
#define PIN_TFT_DC     14u  // GP14 – data / command
#define PIN_TFT_RST    15u  // GP15 – hard reset   (active LOW)
#define PIN_TFT_BL     16u  // GP16 – backlight PWM (PWM0A slice 0)

// ---------------------------------------------------------------------------
// XPT2046 touch controller
// ---------------------------------------------------------------------------
#define PIN_TCH_CS     17u  // GP17 – touch chip select (active LOW)
#define PIN_TCH_IRQ    18u  // GP18 – touch interrupt   (active LOW)

// ---------------------------------------------------------------------------
// SPI clock frequencies
// ---------------------------------------------------------------------------
#define TFT_SPI_BAUD   40000000u  // 40 MHz – ST7796S max write speed
#define TCH_SPI_BAUD    2000000u  //  2 MHz – XPT2046 max recommended

// ---------------------------------------------------------------------------
// Display geometry
// ---------------------------------------------------------------------------
#define TFT_WIDTH      480u
#define TFT_HEIGHT     320u

// ---------------------------------------------------------------------------
// USB identifiers  (VID shared with macro-eleven, new PID)
// ---------------------------------------------------------------------------
#define USB_VID        0x4653
#define USB_PID        0x0003
