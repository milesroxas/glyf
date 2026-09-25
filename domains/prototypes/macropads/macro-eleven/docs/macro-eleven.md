# Macro Eleven: hardware and firmware reference

11-key macropad on a Raspberry Pi Pico (RP2040) running QMK. App launcher and per-app shortcut pad for macOS. Quick start, flashing, and releases: [README](../README.md). Companion app: [apps/macro-eleven](../../../../../apps/macro-eleven/).

## Hardware

| Component | Detail |
|-----------|--------|
| MCU | RP2040 (Raspberry Pi Pico) |
| Keys | 11 mechanical switches |
| Matrix | 4 columns × 3 rows, COL2ROW with diodes |
| Column pins (output) | GP5, GP4, GP3, GP2 (col 0 → 3, order matches the physical wiring) |
| Row pins (input) | GP6, GP7, GP8 |
| Potentiometer | GP26 (ADC0), 10-bit (0–1023) |
| USB | VID `0x4653`, PID `0x0002` |

### Physical layout

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

Columns carry their logical matrix index (col 0 = GP5, col 3 = GP2). The top-left key is **HOME** (`BACK_HOME`): tap to return to layer 0, hold 2 s to enter the bootloader. Which key is physically top-left is an open question (audit FW-08); the rev 2 [wiring guide](rev2-wiring-guide.md) proposes `[0,0]`.

## Firmware files

`firmware/` is the QMK keyboard source. `build.sh` copies it to `$QMK_DIR/keyboards/handwired/macro_eleven/` (default `~/qmk_firmware`) before it compiles. Edit the repo copy; the QMK copy is overwritten.

| File | Purpose |
|------|---------|
| `keyboard.json` | Matrix pins, USB IDs, layout |
| `config.h` | Debounce, VIA layer and macro counts, `POT_PIN`, bootmagic key |
| `halconf.h`, `mcuconf.h` | ChibiOS config that enables the RP2040 ADC |
| `rules.mk` | Build rules (analog driver, Raw HID) |
| `macro_eleven.c` / `.h` | Keyboard level: Raw HID system commands, `QK_BOOT` 2 s hold, `raw_hid_receive_keymap()` hook |
| `version.h` | Firmware version reported to the app |
| `via.json` | VIA definition |
| `keymaps/apps/keymap.c` | Primary keymap: app launcher, per-app layers, pot logic, companion commands |
| `keymaps/via/keymap.c` | VIA keymap |
| `keymaps/default/keymap.c` | Test keymap |

## Keymaps

### `apps` (primary)

Layer 0 launches apps through Spotlight. Each app key opens the app and switches to that app's shortcut layer. HOME is top-left on all 11 layers.

**Host control.** This keymap boots with host control ("test mode") on. The firmware then sends no keycodes, and the companion app runs the actions instead ([keymap engine](../../../../../apps/macro-eleven/docs/keymap-engine.md)). The standalone behavior below needs host control off (the switch on the app's Diagnostics page). Without the app, the pad types nothing (audit FW-01).

```
┌────────┬────────┬────────┐
│  HOME  │ Chrome │ Figma  │
├────────┼────────┼────────┼────────┐
│ VSCode │ Slack  │Spotify │  Term  │
├────────┼────────┼────────┼────────┤
│  Msgs  │ Notes  │ Music  │ Finder │
└────────┴────────┴────────┴────────┘
```

| Key | App | Layer | Shortcuts |
|-----|-----|-------|-----------|
| HOME | – | 0 | Tap: app selection. Hold 2 s: bootloader. |
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

An app key sends `Cmd+Space`, waits 500 ms, types the app name, waits 400 ms, presses Enter, and switches to the app's layer. The waits block the keyboard for about 1 s (audit FW-06).

**Change an app:** in `keymaps/apps/keymap.c`, edit the `launch_app("App Name", layer)` call for that keycode in `process_record_user()`. The name must be what you would type in Spotlight.

**Add an app:** add a keycode to the enum, put it on layer 0 in `keymaps`, add a layer with its shortcuts, and add a `launch_app()` case.

**Change shortcuts:** edit the layer in `keymaps`. Examples: `LGUI(KC_T)` = Cmd+T, `LGUI(LSFT(KC_T))` = Cmd+Shift+T, `LGUI(LALT(KC_I))` = Cmd+Option+I, `KC_MPLY` = play/pause, `KC_NO` = unassigned.

### `via`

4 layers, meant for remapping in the [VIA app](https://usevia.app) (load `via.json` as a design definition). The top-left key cycles layers.

| Layer | Content |
|-------|---------|
| 0 | Numbers 1–0 |
| 1 | F1–F10 |
| 2 | Media controls |
| 3 | macOS shortcuts (cut, copy, paste, undo, save, redo) |

VIA does not work with this build yet: the keymap has no `rules.mk` with `VIA_ENABLE = yes` (audit FW-04).

### `default`

Test keymap: numbers 1–0 with a layer-cycle key, plus two fallback layers.

## Build

```bash
./build.sh [apps|via|default] [flash]   # keymap defaults to via
./watch-and-flash.sh                    # waits for the bootloader, then asks which keymap to flash (default apps)
cd ~/qmk_firmware && qmk compile -kb handwired/macro_eleven -km apps   # direct compile of the synced copy
```

Flashing, recovery, and firmware releases: [README](../README.md#flashing).

### Firmware updates from the companion app

The app bundles a release build of the `apps` keymap (`apps/macro-eleven/src-tauri/firmware/`) and offers it to any device that reports an older version.

1. The app sends `GET_INFO` to read the installed version. Firmware before 1.1.0 does not answer.
2. The app sends `ENTER_BOOTLOADER`. The firmware answers, then calls `reset_usb_boot()`. Flag bit 0 hides the RPI-RP2 drive (macOS and Linux) because the app flashes over PICOBOOT, the USB interface `picotool` uses.
3. The app erases and writes flash sector by sector, then reads it back to verify. Sector 0 (boot2) is erased first and written last. If the update stops part-way, the device stays in the bootloader and the app can finish the update.
4. The device reboots. The app waits for it to report the new version.

On Windows, PICOBOOT needs a WinUSB driver, so the drive stays visible and the app copies the UF2 to it. On Linux, the app needs udev access to `2e8a:0003` (bootloader) and `4653:0002` (Raw HID).

## Raw HID protocol

32-byte reports, usage page `0xFF60`. The host writes 33 bytes: report ID `0x00` plus the report. `macro_eleven.c` handles the system commands for every keymap. Only the `apps` keymap handles `0x01` and `0x02` (audit FW-03).

| Cmd | Name | Request | Reply |
|-----|------|---------|-------|
| `0x01` | Poll state | `[0x01]` | `[0x01, key_lo, key_hi, pot_lo, pot_hi, layer, test_mode]` |
| `0x02` | Set test mode (host control) | `[0x02, enable]` | `[0x02, enabled]` |
| `0x03` | `GET_INFO` | `[0x03]` | `[0x03, protocol = 1, major, minor, patch]` (firmware 1.1.0+) |
| `0x04` | `ENTER_BOOTLOADER` | `[0x04, 'B', 'O', 'O', 'T', flags]` | `[0x04, 1]`, then reboot to the RP2040 bootloader. Flag bit 0 hides the RPI-RP2 drive. |

Poll reply fields:

- `key_lo`, `key_hi`: 11-bit key bitmask, one bit per matrix position.
- `pot_lo`, `pot_hi`: potentiometer ADC value, uint16 little-endian, 0–1023.
- `layer`: highest active firmware layer.
- `test_mode`: 1 while host control is on.

A versioned v2 protocol shared with the Glyf display is planned (audit LINK-01).

## Configuration

| Setting | File | Current value |
|---------|------|---------------|
| Matrix pins | `keyboard.json` `matrix_pins` | cols `GP5, GP4, GP3, GP2`, rows `GP6, GP7, GP8`. Column order is reversed from the schematic to match the wiring. |
| USB identity | `keyboard.json` `usb` | VID `0x4653`, PID `0x0002`, device version `1.0.0` |
| Debounce | `config.h` `DEBOUNCE` | 5 ms |
| VIA layers / macros | `config.h` `DYNAMIC_KEYMAP_LAYER_COUNT` / `_MACRO_COUNT` | 4 / 16 |
| Bootmagic key | `config.h` `BOOTMAGIC_ROW` / `_COLUMN` | `[0,2]` |
| Potentiometer pin | `config.h` `POT_PIN` | `GP26` |
| Firmware version | `version.h` | 1.1.0 |
| Bootloader hold | `macro_eleven.c` `housekeeping_task_kb()` (for `QK_BOOT`) and `keymaps/apps/keymap.c` `matrix_scan_user()` (for `BACK_HOME`) | 2000 ms |

The app normally enters the bootloader over Raw HID. The key hold is the manual fallback.

## Potentiometer

Wiring: left outer pin to GND, wiper to GP26, right outer pin to 3V3. Swap the outer pins to reverse direction. To move it, use GP27 or GP28 (the other ADC pins) and update `POT_PIN`. Do not use GP29: it measures VSYS on the Pico.

Pot logic is in `keymaps/apps/keymap.c` `matrix_scan_user()`. A change of more than 80 ADC counts (about 12 steps over the full range) sends one tap:

| Layer | Clockwise | Counter-clockwise |
|-------|-----------|-------------------|
| 0 (App Selection) | `KC_VOLU` | `KC_VOLD` |
| 2 (Figma) | `Tab` (next sibling) | `Shift+Tab` (previous sibling) |
| 2, Depth key held | `Enter` (select children) | `\` (select parent) |

The Depth key is at `[2,0]` on the Figma layer (bottom-left). Other layers ignore the pot. The pot also runs under host control (audit FW-02).

## Differences from Four Pad

| | Four Pad | Macro Eleven |
|---|----------|-------------|
| Keys | 7 (direct-wired) | 11 (matrix with diodes) |
| Matrix | Direct GPIO | 4×3 COL2ROW |
| Display | 16×2 I²C LCD | None |
| USB PID | `0x0001` | `0x0002` |
| App layers | 6 | 10 |
| Potentiometer | No | GP26 (ADC0) |
