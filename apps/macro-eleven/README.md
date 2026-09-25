# Macro Eleven app

Desktop companion (Tauri) for the [Macro Eleven](../../domains/prototypes/macropads/macro-eleven/) macropad. It runs keymap actions on the host, shows live key and knob input, and updates the device firmware over USB.

## Features

| Page | What it does |
|------|--------------|
| Designer | Edit every key on every layer: apps, shortcuts, layer switches, and macros. Changes save as you go and reach the pad at once; ⌘Z undoes. Press a key on the pad to select it. Named profiles can be switched, duplicated, imported, and exported. |
| Diagnostics | Live key presses, event feed, and the host-control switch |
| Knob | Live potentiometer value (0–1023) |
| Firmware | Compares device and bundled firmware and installs the update |
| Overlay | Compact always-on-top window with the current layer's keys |

How key presses become actions: [docs/keymap-engine.md](docs/keymap-engine.md).

## Run

Prerequisites are in the [root README](../../README.md#prerequisites). Connect the macropad over USB (VID `0x4653`, PID `0x0002`).

```bash
pnpm install                  # from repo root
pnpm dev:macro-eleven         # dev mode: Vite HMR + Rust rebuild
pnpm --filter macro-eleven tauri build   # release build
```

Shortcuts and macros need macOS Accessibility permission; the designer shows a banner with a link to System Settings until it is granted. Opening apps needs no permission.
