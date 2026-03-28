# glyf – Hardware & Firmware Reference

## Overview

**glyf** is an RP2040-based USB display device featuring a 4.0" ST7796S SPI TFT
(480×320 pixels, RGB565) with XPT2046 resistive touch.  It communicates with
the host via USB Raw HID (same usage page as macro-eleven) and is controlled by
the `apps/glyf` Tauri companion app.

---

## Hardware Specifications

| Parameter       | Value                                     |
|-----------------|-------------------------------------------|
| MCU             | RP2040 (Raspberry Pi Pico)                |
| Display         | ST7796S 4.0" SPI TFT                      |
| Resolution      | 480 × 320 px                              |
| Colour depth    | 16-bit RGB565                             |
| Touch           | XPT2046 resistive (12-bit ADC)            |
| USB VID         | `0x4653`                                  |
| USB PID         | `0x0003`                                  |
| HID usage page  | `0xFF60` (Raw HID)                        |

---

## GPIO Pinout

All display and touch signals share **SPI1** (hardware-accelerated on the RP2040).
Two separate CS lines keep the peripherals independent on the shared bus.

| GPIO  | Signal      | Direction | Description                          |
|-------|-------------|-----------|--------------------------------------|
| GP10  | SPI1_SCK    | Out       | SPI1 clock – shared bus              |
| GP11  | SPI1_MOSI   | Out       | SPI1 TX – shared bus                 |
| GP12  | SPI1_MISO   | In        | SPI1 RX – touch read-back            |
| GP13  | TFT_CS      | Out       | Display chip-select (active LOW)     |
| GP14  | TFT_DC      | Out       | Display Data/Command (HIGH = data)   |
| GP15  | TFT_RST     | Out       | Display hard reset (active LOW)      |
| GP16  | TFT_BL      | Out       | Backlight PWM (PWM0A, active HIGH)   |
| GP17  | TCH_CS      | Out       | Touch chip-select (active LOW)       |
| GP18  | TCH_IRQ     | In        | Touch interrupt (active LOW, pull-up)|

> **Why SPI1 (GP10–GP12)?**
> RP2040 SPI peripherals are pinned to specific GPIO banks.  GP10–GP12 are the
> clean SPI1 bank in the middle of the header, leaving GP0–GP9 free for future
> buttons / I²C / UART and GP19–GP28 for LEDs, encoders and ADC.

> **Why not QMK?**
> QMK has no production-grade ST7796S TFT driver at this resolution.  glyf uses
> the Pico SDK directly for full control over SPI DMA, PWM backlight and the
> TinyUSB Raw HID stack.

---

## SPI Bus Sharing

| Phase              | Baud       | CS asserted  |
|--------------------|-----------|--------------|
| Display write      | 40 MHz    | GP13 (TFT_CS)|
| Touch read         |  2 MHz    | GP17 (TCH_CS)|

The XPT2046 driver temporarily lowers the SPI baud to 2 MHz before each touch
read and restores it to 40 MHz immediately after.  Both operations are
single-threaded inside the main loop, so no mutex is required.

---

## USB HID Protocol

Report size: **32 bytes**, usage page `0xFF60`.

### Host → Device (command)

| Byte | Field          | Description                    |
|------|----------------|--------------------------------|
| 0    | `cmd`          | Command byte (see below)       |
| 1…31 | args           | Command-specific arguments     |

| Cmd  | Name               | Args                                  |
|------|--------------------|---------------------------------------|
| 0x01 | Poll state         | *(none)* – device replies immediately |
| 0x02 | Set brightness     | `[1]` = 0–255                         |
| 0x03 | Set display power  | `[1]` = 0 off / 1 on                  |
| 0x04 | Fill display       | `[1]` high byte, `[2]` low byte RGB565|

### Device → Host (state report, response to `0x01`)

| Byte | Field          | Description                         |
|------|----------------|-------------------------------------|
| 0    | `0x01`         | Command echo                        |
| 1    | `brightness`   | Current backlight level 0–255       |
| 2    | `display_on`   | 0 = off, 1 = on                     |
| 3    | `touch_pressed`| 0 / 1                               |
| 4–5  | `touch_x`      | Pixel X (big-endian, 0–479)         |
| 6–7  | `touch_y`      | Pixel Y (big-endian, 0–319)         |
| 8–9  | `touch_z`      | Pressure 0–4095 (big-endian)        |
| 10–31| reserved       | Zero-padded                         |

---

## Firmware Build

Prerequisites: [Pico SDK](https://github.com/raspberrypi/pico-sdk) v1.5+ and CMake.

```bash
cd domains/displays/glyf/firmware
mkdir build && cd build
cmake .. -DPICO_SDK_PATH=/path/to/pico-sdk
make -j4
# Flash: drag glyf.uf2 onto the RPI-RP2 drive
```

Bootloader entry: hold the BOOTSEL button while connecting USB.

---

## Companion App

See `apps/glyf/` for the Tauri desktop companion.  It communicates over Raw HID
at ~60 Hz, mirroring the macro-eleven pattern.
