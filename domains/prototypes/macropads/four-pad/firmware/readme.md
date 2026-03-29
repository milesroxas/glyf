# Four Pad

A 7-key macro pad with LCD1602 display built with Raspberry Pi Pico.

* Keyboard Maintainer: [QMK Community](https://github.com/qmk)
* Hardware Supported: Raspberry Pi Pico (RP2040)
* Hardware Availability: Handwired
* Display: LCD1602 (I2C) on GP14/GP15

## Features

- 7 keys (3×3 matrix, direct pin wiring)
- LCD1602 display showing current layer and key mappings
- Layer selection system for application-specific macros
- VIA support for easy remapping

## Building

Make example for this keyboard (after setting up your build environment):

    qmk compile -kb handwired/four_pad -km default
    qmk compile -kb handwired/four_pad -km via

**Using build script from project directory:**

    cd /path/to/four-pad
    ./build.sh          # default keymap
    ./build.sh via      # via keymap
    ./build.sh via flash  # build and flash automatically

**Auto-flash workflow (recommended for development):**

    ./watch-and-flash.sh

This watches for bootloader mode and automatically builds/flashes when you hold the bootloader reset key for 2 seconds.

See the [build environment setup](https://docs.qmk.fm/#/getting_started_build_tools) and the [make instructions](https://docs.qmk.fm/#/getting_started_make_guide) for more information. Brand new to QMK? Start with our [Complete Newbs Guide](https://docs.qmk.fm/#/newbs).

## Layer System

This firmware uses a layer selection approach:

- **Layer 0**: App selection layer - use `TO(1)`, `TO(2)`, etc. to switch to app-specific layers
- **Layers 1+**: App-specific macro layers - last key should be `TO(0)` to return to app selection

Configure layers in VIA using the `TO(layer)` function found under the "LAYERS" or "Special" tab.

### Customizing Layer Names

Edit `layer_names[]` array in `four_pad.c` to set custom names that appear on the LCD:

```c
static const char* layer_names[] = {
    "App Select",  // Layer 0
    "Chrome",      // Layer 1
    "Figma",       // Layer 2
    NULL,          // Unassigned - shows "Layer 3"
    // ... add more as needed
};
```

## Bootloader

Enter the bootloader in 2 ways:

* **Physical reset button**: Hold the BOOTSEL button on the Pico while plugging in the USB cable
* **Keycode in layout**: Press the key mapped to `QK_BOOT` if it is available
