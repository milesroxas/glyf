# Glyf display module

RP2040 firmware (Pico SDK, C) for the Glyf display module: a 4.0" ST7796S TFT with XPT2046 resistive touch. This is one module of the Glyf line ([product-line.md](../../../docs/product-line.md)). Companion app: [apps/glyf](../../../apps/glyf/).

Hardware, wiring, and HID protocol: [docs/glyf.md](docs/glyf.md).

## Build and flash

Needs the Pico SDK (v1.5+), CMake 3.13+, `arm-none-eabi-gcc`, and OpenOCD for SWD ([sdks/README.md](../../../sdks/README.md)). `build.sh` uses `PICO_SDK_PATH`, or `sdks/pico-sdk` when that is unset.

From the repo root:

```bash
pnpm firmware                  # interactive: build, flash, launch the app
pnpm firmware:build            # build.sh
pnpm firmware:flash:swd        # daily path: SWD probe + OpenOCD
pnpm firmware:flash:picotool   # USB only; needs BOOTSEL (firmware has no picotool reset interface yet)
pnpm firmware:flash:uf2        # copy the UF2 to /Volumes/RPI-RP2 (macOS; recovery and bring-up)
pnpm dev:glyf
```

The scripts in this folder (`build.sh`, `flash-*.sh`) do the same from here. Build and flash stay separate so any flash path can use the same artifact.

## Source

```
firmware/src/
├── main.c              entry point, main loop, TinyUSB callbacks
├── pinout.h            every GPIO, SPI clock, and USB ID (source of truth)
├── tusb_config.h       TinyUSB config
├── usb_descriptors.c   USB descriptors
├── display/st7796s.*   ST7796S driver
├── touch/xpt2046.*     XPT2046 driver
└── hid/hid_handler.*   HID command dispatch and state report
```
