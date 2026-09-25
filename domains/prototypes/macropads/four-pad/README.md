# Four Pad

**R&D prototype.** 7-key handwired macropad on a Raspberry Pi Pico (RP2040) with QMK, an LCD1602, and per-app layers. It predates Macro Eleven and is kept for reference ([product-line.md](../../../../docs/product-line.md)).

## Hardware

| Part | Detail |
|------|--------|
| MCU | Raspberry Pi Pico (RP2040) |
| Keys | 7 MX-compatible switches, one GPIO per key (no diodes) |
| Display | LCD1602 over I²C at `0x27` (some modules use `0x3F`; set `LCD_I2C_ADDRESS` in `config.h`) |
| USB | VID `0x4653`, PID `0x0001` |

| Key pins | Col 0 | Col 1 | Col 2 |
|----------|-------|-------|-------|
| Row 0 | GP0 | GP1 | GP2 |
| Row 1 | GP3 | GP4 | GP5 |
| Row 2 | GP20 | – | – |

LCD wiring: SDA → GP14, SCL → GP15, VCC → VBUS (5 V), GND → GND. The LCD shows the current layer name and key labels.

## Files

| Path | Holds |
|------|-------|
| `firmware/` | QMK keyboard source. `build.sh` copies it to `$QMK_DIR/keyboards/handwired/four_pad/` (default `~/qmk_firmware`). Edit the repo copy; the QMK copy is overwritten. |
| `four_pad_via.json` | VIA definition with macOS key labels |
| `enclosure/stl/` | Print files for the case, plate, and switch base tests |

## Keymaps

| Keymap | VIA | Use |
|--------|-----|-----|
| `apps` | Off | Hardcoded app launchers with automatic layer switching. Recommended. |
| `via` | On | Remap in VIA. 4 dynamic layers, 16 macros. |
| `default` | Off | Numbers and F-keys, for testing |

### `apps`

Layer 0 keys 1–6 launch Chrome, Figma, VS Code, Slack, Spotify, and Terminal through Spotlight, then switch to that app's layer (1–6). Key 7 is `BACK_HOME` on every layer: tap to return to layer 0, hold 2 s for the bootloader.

To change an app, edit its `launch_app("App Name", layer)` case in `firmware/keymaps/apps/keymap.c`. The name must be what you would type in Spotlight. Key labels for the LCD are in `button_labels[]` in the same file. Rebuild with `./build.sh apps flash`.

### `via`

1. In [VIA](https://usevia.app), open Settings → enable **Show Design tab** → Design → **Load** → `four_pad_via.json`.
2. On layer 0, give keys 1–6 `TO(n)` or a macro that launches an app and then switches layer.
3. On layers 1–3, put app shortcuts on keys 1–6 and `TO(0)` on key 7.
4. For a bootloader key, assign `QK_BOOT`. The firmware enters the bootloader after a 2 s hold and shows "Hold for reset" on the LCD.

`BACK_HOME` exists only in the `apps` keymap. The VIA build has no handler for it.

VIA macro syntax: `{KC_X}` taps a key, `{KC_X,KC_Y}` taps a chord, `{500}` waits 500 ms, and plain letters type text. Example (open Figma, then go to layer 2):

```
{KC_LGUI,KC_SPC}{500}{KC_F}{KC_I}{KC_G}{KC_M}{KC_A}{400}{KC_ENT}{QK_TO,2}
```

LCD names: edit `layer_names[]` (layer titles; `NULL` shows "Layer N") and `macro_labels[]` (VIA macro names) in `firmware/four_pad.c`.

## Build and flash

```bash
./build.sh [apps|via|default] [flash]   # keymap defaults to via
./watch-and-flash.sh                    # waits for the bootloader, then asks for a keymap (default apps after 10 s)
```

To enter the bootloader: hold key 7 for 2 s (`apps`), hold a `QK_BOOT` key for 2 s (`via`), or hold BOOTSEL while you plug in USB. For a manual flash, drag `handwired_four_pad_<keymap>.uf2` to the RPI-RP2 drive.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| LCD shows `???` for a key | The firmware does not know the keycode. Use standard VIA keycodes, and load `four_pad_via.json`. |
| LCD shows "App Select" only | Expected on layer 0. App names appear after you switch to their layer. |
| Macro key does not change layer | End the macro with `{QK_TO,n}`. |
| App does not launch | Check the macro braces and delays, or the app name in `launch_app()`. |
