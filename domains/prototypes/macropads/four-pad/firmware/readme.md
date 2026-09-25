# Four Pad

7-key handwired macropad with an LCD1602, on a Raspberry Pi Pico (RP2040).

* Hardware supported: Raspberry Pi Pico (RP2040)
* Hardware availability: handwired
* Display: LCD1602 over I²C on GP14 (SDA) / GP15 (SCL)

Make example for this keyboard (after setting up your build environment):

    qmk compile -kb handwired/four_pad -km apps

Keymaps are `apps`, `via`, and `default`. Wiring, keymaps, VIA setup, and the repo build scripts: [../README.md](../README.md).

## Bootloader

* **Physical:** hold BOOTSEL on the Pico while you plug in USB.
* **Keycode:** hold `BACK_HOME` (`apps` keymap) or `QK_BOOT` (`via` keymap) for 2 seconds.
