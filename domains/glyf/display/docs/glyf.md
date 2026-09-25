# Glyf display module: hardware and protocol reference

RP2040 USB display: 4.0" ST7796S SPI TFT (480×320, RGB565) with XPT2046 resistive touch. The [Glyf app](../../../../apps/glyf/) controls it over Raw HID. Build and flash steps: [README](../README.md).

## Specifications

| Parameter | Value |
|-----------|-------|
| MCU | RP2040 (Raspberry Pi Pico) |
| Display | ST7796S 4.0" SPI TFT, 480 × 320 px, 16-bit RGB565 |
| Touch | XPT2046 resistive, 12-bit ADC |
| USB | VID `0x4653`, PID `0x0003`, Raw HID usage page `0xFF60` |

## Wiring

Rows follow the display's 14-pin header order. [`firmware/src/pinout.h`](../firmware/src/pinout.h) is the source of truth.

| # | TFT pin | Pico | Signal | Notes |
|---|---------|------|--------|-------|
| 1 | VCC | 3V3(OUT) | Power | |
| 2 | GND | GND | Ground | |
| 3 | CS | GP13 | `TFT_CS` | Display chip select, active LOW |
| 4 | RESET | GP15 | `TFT_RST` | Hard reset, active LOW |
| 5 | DC/RS | GP14 | `TFT_DC` | HIGH = data, LOW = command |
| 6 | SDI (MOSI) | GP11 | `SPI1_MOSI` | Shared bus |
| 7 | SCK | GP10 | `SPI1_SCK` | Shared bus |
| 8 | LED | GP16 | `TFT_BL` | Backlight PWM (PWM0A), active HIGH |
| 9 | SDO (MISO) | GP12 | `SPI1_MISO` | Shared bus |
| 10 | T_CLK | GP10 | `SPI1_SCK` | Same net as pin 7 |
| 11 | T_CS | GP17 | `TCH_CS` | Touch chip select, active LOW |
| 12 | T_DIN | GP11 | `SPI1_MOSI` | Same net as pin 6 |
| 13 | T_DO | GP12 | `SPI1_MISO` | Same net as pin 9 |
| 14 | T_IRQ | GP18 | `TCH_IRQ` | Touch interrupt, active LOW, pull-up |

Display and touch share SPI1. Separate CS lines keep them independent. GP10–GP12 are the SPI1 bank in the middle of the header, which leaves GP0–GP9 free for buttons, I²C, or UART, and GP19–GP28 free for LEDs, encoders, and ADC.

### SPI bus sharing

| Phase | Clock | CS |
|-------|-------|----|
| Display write | 40 MHz | GP13 |
| Touch read | 2 MHz | GP17 |

The XPT2046 driver lowers the SPI clock to 2 MHz for each touch read and restores 40 MHz after it. Both run in the main loop on one thread, so no lock is needed. Display writes use blocking SPI today; DMA is planned (audit SCR-09).

### SWD (flashing and debug)

Use a Raspberry Pi Debug Probe or another 3.3 V CMSIS-DAP probe.

| Probe | Pico |
|-------|------|
| `SC` / `SWCLK` | `SWCLK` |
| `SD` / `SWDIO` | `SWDIO` |
| `GND` | `GND` |

The SWD header does not power the Pico. Power it over USB or `VSYS`.

`flash-swd.sh` uses OpenOCD `interface/cmsis-dap.cfg` and `target/rp2040.cfg` at 5000 kHz. Override with `GLYF_OPENOCD_INTERFACE_CFG`, `GLYF_OPENOCD_TARGET_CFG`, or `GLYF_OPENOCD_ADAPTER_SPEED`:

```bash
GLYF_OPENOCD_INTERFACE_CFG=interface/picoprobe.cfg bash flash-swd.sh
```

## USB HID protocol

32-byte reports. The host writes 33 bytes: report ID `0x00` plus the 32-byte report.

### Host → device

| Cmd | Name | Args |
|-----|------|------|
| `0x01` | Poll state | None. The device replies at once. |
| `0x02` | Set brightness | `[1]` = 0–255 |
| `0x03` | Set display power | `[1]` = 0 off, 1 on |
| `0x04` | Fill display | `[1]` high byte, `[2]` low byte of an RGB565 color |

### Device → host (reply to `0x01`)

| Byte | Field | Value |
|------|-------|-------|
| 0 | echo | `0x01` |
| 1 | `brightness` | 0–255 |
| 2 | `display_on` | 0 or 1 |
| 3 | `touch_pressed` | 0 or 1 |
| 4–5 | `touch_x` | Pixel X, big-endian, 0–479 |
| 6–7 | `touch_y` | Pixel Y, big-endian, 0–319 |
| 8–9 | `touch_z` | Pressure 0–4095, big-endian |
| 10–31 | reserved | Zero |

A versioned v2 protocol shared with Macro Eleven is planned (audit LINK-01).

## Why the Pico SDK, not QMK

QMK has no production-grade ST7796S driver at this resolution. The Pico SDK gives direct control of SPI, the PWM backlight, and the TinyUSB Raw HID stack.
