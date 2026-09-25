# Macro Eleven app

Desktop companion (Tauri) for the [Macro Eleven](../../domains/prototypes/macropads/macro-eleven/) macropad. It runs keymap actions on the host, shows live key and knob input, and updates the device firmware over USB.

## Features

| Page | What it does |
|------|--------------|
| Key Tester | Live key presses, event feed, and the host-control switch |
| Layer Viewer | Key assignments per layer from the active keymap JSON. Reload and open the keymap file. |
| Pot Monitor | Live potentiometer value (0–1023) |
| Keymap Designer | App-launch bindings. Full editor in progress: [plan](../../docs/plans/2026-09-25-keymap-designer.md). |
| Firmware | Compares device and bundled firmware and installs the update |
| Overlay | Compact always-on-top window with the current layer |

How key presses become actions: [docs/keymap-engine.md](docs/keymap-engine.md).

## Run

Prerequisites are in the [root README](../../README.md#prerequisites). Connect the macropad over USB (VID `0x4653`, PID `0x0002`).

```bash
pnpm install                  # from repo root
pnpm dev:macro-eleven         # dev mode: Vite HMR + Rust rebuild
pnpm --filter macro-eleven tauri build   # release build
```

Shortcuts and macros need macOS Accessibility permission. App launching needs Automation permission.
