# Macro Eleven

An 11-key macropad built on the Raspberry Pi Pico (RP2040) running QMK firmware. Designed as an app launcher and per-app shortcut pad for macOS.

## Hardware

| Component | Detail |
|-----------|--------|
| MCU | RP2040 (Raspberry Pi Pico) |
| Keys | 11 mechanical switches |
| Matrix | 4 columns x 3 rows (COL2ROW with diodes) |
| Column pins (output) | GP5, GP4, GP3, GP2 (col 0→3, order matches physical wiring) |
| Row pins (input) | GP6, GP7, GP8 |
| Potentiometer | GP26 (ADC0) — left to GND, middle to GP26, right to 3V3 |
| USB | VID `0x4653`, PID `0x0002` |

### Physical Layout

```
         Col 3    Col 2    Col 1    Col 0
       ┌────────┬────────┬────────┬────────┐
Row 0  │  HOME  │  Key 1 │  Key 2 │ (none) │  <- no switch at [0,3]
       ├────────┼────────┼────────┼────────┤
Row 1  │  Key 3 │  Key 4 │  Key 5 │  Key 6 │
       ├────────┼────────┼────────┼────────┤
Row 2  │  Key 7 │  Key 8 │  Key 9 │ Key 10 │
       └────────┴────────┴────────┴────────┘
```

Columns are labeled by logical matrix index (col 0 = GP5, col 3 = GP2). The top-left key is **HOME** (BACK_HOME): tap to return to app selection; hold 2 seconds to enter bootloader. Position [0,3] has no physical switch.

## Project Structure

```
domains/rnd/macropads/macro-eleven/
├── firmware/          # QMK keyboard source (synced to qmk_firmware on build)
├── config/
├── docs/
│   └── macro-eleven.md    (this file)
├── enclosure/
│   ├── source/
│   ├── step/
│   └── stl/
├── hardware/
│   ├── pcb/
│   └── schematic/
├── build.sh
└── watch-and-flash.sh
```

### QMK Firmware Files

Firmware source lives in `firmware/`. The build script syncs it to `~/qmk_firmware/keyboards/handwired/macro_eleven/` before compiling:

| File | Purpose |
|------|---------|
| `keyboard.json` | Hardware definition: matrix pins, USB IDs, layout |
| `config.h` | Debounce timing, VIA layer/macro counts, potentiometer pin |
| `halconf.h` | ChibiOS HAL config: enables ADC subsystem |
| `mcuconf.h` | ChibiOS MCU config: enables RP2040 ADC1 peripheral |
| `rules.mk` | Build rules (analog driver for potentiometer) |
| `macro_eleven.c` | Keyboard-level logic: QK_BOOT 2-second hold for bootloader |
| `via.json` | VIA app configuration for remapping keys |
| `keymaps/apps/keymap.c` | Primary keymap: app launcher + per-app shortcuts |
| `keymaps/via/keymap.c` | VIA-compatible keymap for GUI remapping |
| `keymaps/default/keymap.c` | Basic testing keymap |

## Keymaps

### `apps` (primary)

The main keymap. Layer 0 launches apps via macOS Spotlight. Each app press opens the app and switches to a dedicated shortcut layer.

**Layer 0 - App Selection:**

```
┌────────┬────────┬────────┐
│  HOME  │ Chrome │ Figma  │
├────────┼────────┼────────┼────────┐
│ VSCode │ Slack  │Spotify │  Term  │
├────────┼────────┼────────┼────────┤
│  Msgs  │ Notes  │ Music  │ Finder │
└────────┴────────┴────────┴────────┘
```

**App-to-layer mapping:**

| Key | App | Layer | Shortcuts |
|-----|-----|-------|-----------|
| HOME | - | 0 | Returns to app selection (tap), bootloader (hold 2s) |
| Chrome | Google Chrome | 1 | New tab, close, reopen, prev/next tab, devtools, reload, back, forward, address bar |
| Figma | Figma | 2 | Frame, text, rectangle, pen, comment, zoom, depth (pot modifier), zoom in/out, prototype |
| VSCode | Visual Studio Code | 3 | Quick open, find, replace, comment, format, terminal, save, close, reopen, command palette |
| Slack | Slack | 4 | Search, DMs, threads, all unreads, jump, emoji, edit, react, upload, mark read |
| Spotify | Spotify | 5 | Prev, play/pause, next, vol down, mute, vol up (media keys) |
| Terminal | Terminal | 6 | New tab, close, clear, prev/next tab, search, split, split horizontal, prev/next pane |
| Messages | Messages | 7 | New message, info, delete, search |
| Notes | Notes | 8 | New note, find, delete, bold, italic, list, checklist, title, heading |
| Music | Apple Music | 9 | Prev, play/pause, next, vol down, mute, vol up (media keys) |
| Finder | Finder | 10 | New window, close, info, delete, new folder, search, icon/list/column/gallery view |

#### How app launching works

When you press an app key on layer 0, the firmware:
1. Opens Spotlight (`Cmd+Space`)
2. Types the app name
3. Presses Enter
4. Switches to that app's shortcut layer

Pressing HOME from any layer returns to layer 0. All 11 layers have HOME in the top-left position.

### `via`

A VIA-compatible keymap with 4 layers. Use the [VIA web app](https://usevia.app) to remap keys through a GUI. Top-left key cycles through layers.

| Layer | Content |
|-------|---------|
| 0 | Numbers 1-0 |
| 1 | Function keys F1-F10 |
| 2 | Media controls |
| 3 | macOS shortcuts (cut, copy, paste, undo, save, redo) |

To use VIA, load `via.json` as a custom design definition in the VIA app.

### `default`

Minimal keymap for testing. Numbers 1-0 with a layer cycle key. Two transparent fallback layers.

## Building and Flashing

### Quick build

```bash
cd macro-eleven         # or your path to the project
./build.sh apps         # build apps keymap (recommended)
./build.sh via          # build via keymap (default if no arg)
./build.sh default      # build default keymap
```

### Build and flash

```bash
./build.sh apps flash   # build and flash immediately
```

Put the Pico in bootloader mode first: hold the top-left key for 2 seconds (or hold BOOTSEL when plugging in). Then run the command. `picotool` will flash the firmware.

### Watch mode

```bash
./watch-and-flash.sh
```

Watches for the Pico to enter bootloader mode (hold top-left key 2s), then presents a menu to choose which keymap to flash. Default is `apps`.

### Manual flash

1. Hold the top-left key for 2 seconds to enter bootloader (or hold BOOTSEL when plugging in)
2. Drag the `.uf2` file to the RPI-RP2 drive

### Direct QMK compile

```bash
cd ~/qmk_firmware
qmk compile -kb handwired/macro_eleven -km apps
```

## Configuration Reference

### Changing apps (apps keymap)

Edit `keymaps/apps/keymap.c`.

**To change which app a key launches**, modify the `process_record_user()` switch statement. Each case calls `launch_app("App Name", layer_number)`:

```c
case APP_CHROME:
    launch_app("Chrome", 1);  // Change "Chrome" to your app name
    return false;
```

The app name must match what you'd type into Spotlight to find it.

**To add or replace an app:**
1. Update the enum at the top of the file with your new keycode name
2. Add it to layer 0 in the `keymaps` array
3. Create a new layer with shortcuts for that app
4. Add a case in `process_record_user()` calling `launch_app()`

**To change shortcuts on an app layer**, modify the relevant layer in the `keymaps` array. Each key is a QMK keycode. Common patterns:
- `LGUI(KC_T)` = Cmd+T
- `LGUI(LSFT(KC_T))` = Cmd+Shift+T
- `LGUI(LALT(KC_I))` = Cmd+Option+I
- `KC_MPLY` = media play/pause
- `KC_NO` = no action (unassigned)

### Changing matrix pins

Edit `keyboard.json`. Column order may need adjustment to match physical wiring (current order GP5→GP2 is reversed from schematic):

```json
"matrix_pins": {
    "cols": ["GP5", "GP4", "GP3", "GP2"],
    "rows": ["GP6", "GP7", "GP8"]
}
```

### Changing debounce timing

Edit `config.h`:

```c
#define DEBOUNCE 5  // milliseconds
```

### VIA layer/macro counts

Edit `config.h`:

```c
#define DYNAMIC_KEYMAP_LAYER_COUNT 4
#define DYNAMIC_KEYMAP_MACRO_COUNT 16
```

### USB identity

Edit `keyboard.json`:

```json
"usb": {
    "vid": "0x4653",
    "pid": "0x0002",
    "device_version": "1.0.0"
}
```

### Bootloader hold timing

The 2-second hold duration is set in two places:
- `macro_eleven.c` — `housekeeping_task_kb()` (for QK_BOOT keycode)
- `keymaps/apps/keymap.c` — `matrix_scan_user()` (for BACK_HOME key)

Change `2000` to your preferred milliseconds.

## Potentiometer

A potentiometer is wired to GP26 (ADC0) for analog input. Pot logic lives in `keymaps/apps/keymap.c` and is active on:
- **Layer 0** (App Selection): volume up/down
- **Layer 2** (Figma): layer tree navigation (sibling/depth)  
Other layers: no pot action.

### Wiring

```
Potentiometer         Pico
─────────────         ────
Left outer   ───────  GND
Middle (wiper) ─────  GP26
Right outer  ───────  3V3 (3.3V)
```

Swapping the two outer pins reverses the direction (clockwise vs counterclockwise).

### Figma Layer Navigation

The pot navigates Figma's layer tree on layer 2 using a step size of ~80 ADC counts (~51 steps across the full range).

**Sibling mode (default rotation):**

| Direction | Action | Figma shortcut |
|-----------|--------|----------------|
| Clockwise | Next sibling | `Tab` |
| Counter-clockwise | Previous sibling | `Shift+Tab` |

**Depth mode (hold Depth key + rotate):**

| Direction | Action | Figma shortcut |
|-----------|--------|----------------|
| Clockwise | Select children (deeper) | `Enter` |
| Counter-clockwise | Select parent (shallower) | `\` |

The **Depth** key is at position [2,0] on the Figma layer (bottom-left).

### Configuration

The pin is defined in `config.h`:

```c
#define POT_PIN GP26
```

### Changing the pin

Move the wiper wire to GP27 or GP28 (the other ADC-capable pins), then update `config.h`:

```c
#define POT_PIN GP27  // or GP28
```

Avoid GP29 — it's wired to VSYS on the Pico board.

## Differences from Four Pad

| | Four Pad | Macro Eleven |
|---|----------|-------------|
| Keys | 7 (direct-wired) | 11 (matrix with diodes) |
| Matrix | Direct GPIO | 4x3 COL2ROW |
| LCD | 16x2 I2C LCD | None |
| USB PID | 0x0001 | 0x0002 |
| App layers | 6 | 10 |
| I2C | Required | Not used |
| Potentiometer | No | GP26 (ADC0) |
