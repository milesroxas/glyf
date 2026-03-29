# Glyf — display module

RP2040 firmware for the **Glyf display module**: the 4.0" ST7796S TFT + XPT2046
resistive touch board. This directory is the **display** piece of the Glyf product
line (see [docs/product-line.md](../../../docs/product-line.md)), not the whole line by itself.

## Quick Start

```bash
export PICO_SDK_PATH=/path/to/pico-sdk

bash build.sh
bash flash-picotool.sh   # explicit USB flashing path
# or
bash flash-uf2.sh        # explicit BOOTSEL / mounted RPI-RP2 path
```

## Structure

```
firmware/
├── CMakeLists.txt
└── src/
    ├── main.c              # Entry point + TinyUSB callbacks
    ├── pinout.h            # All GPIO assignments (single source of truth)
    ├── tusb_config.h       # TinyUSB / USB descriptor config
    ├── display/
    │   ├── st7796s.h       # ST7796S driver API
    │   └── st7796s.c       # ST7796S driver implementation
    ├── touch/
    │   ├── xpt2046.h       # XPT2046 driver API
    │   └── xpt2046.c       # XPT2046 driver implementation
    └── hid/
        ├── hid_handler.h   # HID command / report API
        └── hid_handler.c   # HID command / report implementation
```

See [`docs/glyf.md`](docs/glyf.md) for full hardware reference and HID protocol.
