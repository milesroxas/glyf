# Macro Eleven

**R&D prototype** — 11-key macropad on Raspberry Pi Pico (RP2040) with QMK, used for
layout and host-side keymap experiments that inform the **Glyf** product line. It is
not positioned as the long-term retail identity of Glyf; see
[docs/product-line.md](../../../../docs/product-line.md).

App launcher and per-app shortcuts for macOS.

## Quick Start

```bash
./build.sh apps         # Build apps keymap
./build.sh apps flash   # Build and flash (no button press on firmware 1.1.0+)
./bundle-firmware.sh    # Ship the apps build in the companion app as an update
```

## Flashing

- **Companion app:** Firmware page → Update. The app reboots the device into its
  bootloader over Raw HID, flashes it, and confirms the new version.
- **CLI:** `./build.sh apps flash` uses the same update path as the app.
  Close the companion app first, since macOS gives one process the device.
- **Firmware before 1.1.0** can't reboot itself. When prompted, hold the top-left key for 2 seconds.
- **Recovery:** Hold BOOTSEL while plugging in USB, then run `./build.sh apps flash`
  or drag `handwired_macro_eleven_apps.uf2` to RPI-RP2.

## Releasing a firmware update

1. Bump `firmware/version.h`.
2. Run `./bundle-firmware.sh`. It builds the `apps` keymap and writes
   `apps/macro-eleven/src-tauri/firmware/{macro_eleven.uf2,manifest.json}`.
3. Commit both files and ship the app. The app offers the update to any device
   that reports an older version.

## Keymaps

| Keymap | Use |
|--------|-----|
| `apps` | App launcher + per-app shortcuts (Chrome, Figma, VSCode, etc.) |
| `via` | VIA-compatible for GUI remapping |
| `default` | Minimal test keymap |

## Documentation

See [docs/macro-eleven.md](docs/macro-eleven.md) for hardware details, configuration, and keymap customization.
