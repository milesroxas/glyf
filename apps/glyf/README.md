# Glyf app

Desktop companion (Tauri) for the [Glyf display module](../../domains/glyf/display/): the 4.0" ST7796S TFT with XPT2046 touch. It controls brightness and power, shows touch input, and stores device settings.

## Features

| Page | What it does |
|------|--------------|
| Display | Brightness, power, and a display preview. Connect and Disconnect sit in the header. |
| Touch Monitor | Live touch points and pressure |
| Settings | Orientation, default brightness, and sleep timeout, saved to `~/.config/glyf/config.json` |
| Debug | Debug snapshot, activity log, and manual fill, brightness, and power controls |

## Run

Prerequisites are in the [root README](../../README.md#prerequisites). Connect the display module over USB (VID `0x4653`, PID `0x0003`).

```bash
pnpm install                  # from repo root
pnpm dev:glyf                 # dev mode: Vite HMR + Rust rebuild
pnpm --filter ./apps/glyf tauri build   # release build
```

Use `--filter ./apps/glyf`, not `--filter glyf`: the root package is also named `glyf` (audit H-03).
