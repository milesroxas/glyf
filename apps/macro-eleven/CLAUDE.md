# Macro Eleven companion app

Features and run commands: [README.md](README.md). Repo-wide rules (FSD, typed IPC, theme tokens): [root CLAUDE.md](../../CLAUDE.md). Device hardware and wire protocol: [macro-eleven.md](../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md). Key-to-action behavior: [docs/keymap-engine.md](docs/keymap-engine.md).

Work in progress: [Keymap Designer plan](../../docs/plans/2026-09-25-keymap-designer.md) (KD-xx) and [audit](../../docs/audit/2026-09-24-action-plan.md) (ME-xx, UI-xx). Check them before changing keymap storage, commands, or the connection thread.

## Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (`components.json`), react-router-dom. Tauri v2 (Rust). Raw HID through the `hidapi` crate. Keymap types from `@glyf/keymap-schema`.

## Frontend map

| Path | Holds |
|------|-------|
| `entities/` | `device`, `key` (`MATRIX_LAYOUT`, key/pot events), `layer`, `keymap`, `action`, `firmware` |
| `features/` | `key-tester`, `layer-viewer`, `pot-monitor`, `overlay`, `firmware-update` |
| `pages/` | Routes `/` Key Tester, `/layers`, `/pot`, `/designer` (read-only list of app launchers until the plan lands), `/firmware`. `#/overlay` renders the overlay window. |
| `shared/lib/` | `tauri.ts` (command wrappers), hooks (`useDeviceStatus`, `useKeyEvents`, `usePotValue`, `useLayerData`, `useLaunchBindings`), `keycode-labels.ts` |
| `shared/ui/` | `MacropadGrid` (3-4-4 grid, empty cell at `[0,3]`), `KnobDial`, `NavBar`, `StatusBadge`, shadcn primitives |

Known FSD violation: `shared/ui/MacropadGrid.tsx` imports runtime values from `entities/key` (audit UI-01).

## Backend map (`src-tauri/src/`)

| Path | Holds |
|------|-------|
| `lib.rs` | Command registration. Starts the HID poll thread in `setup`. |
| `hid/connection.rs` | `HidConnection`: poll thread (~60 Hz) from launch, auto-reconnect, `suspend()` hands the device to the firmware updater |
| `hid/protocol.rs` | Report build/parse for commands `0x01`-`0x04` |
| `hid/keymap_engine.rs` | Key-state diff, layer choice, action dispatch |
| `executor/` | `actions.rs` runs actions; `runtime/` per OS (`macos.rs` CGEvent + osascript, `windows.rs`, `noop.rs`); `shortcuts.rs` token parser; `app_detector.rs` frontmost app |
| `config/` | `keymap.rs` (serde mirror of the schema), `storage.rs` (`~/.config/macro-eleven/keymaps/`) |
| `firmware/` | Update path: `bundle.rs` (manifest + UF2), `updater.rs`, `picoboot.rs` (RP2040 bootloader USB protocol), `mass_storage.rs` (Windows fallback), `uf2.rs`, `version.rs` |
| `keymap/parser.rs` | Legacy `keymap.c` parser, only reached through `get_layer_data(path)` (audit ME-12) |
| `commands/` | Tauri commands, below |

## IPC

Commands by file. Only the ones marked * have a wrapper in `shared/lib/tauri.ts`.

| File | Commands |
|------|----------|
| `device.rs` | `detect_device_cmd`*, `get_device_status`*, `set_test_mode`*, `reload_keymap`* |
| `firmware.rs` | `get_firmware_status`*, `update_firmware`* |
| `layers.rs` | `get_layer_data`* |
| `overlay.rs` | `open_overlay_window`* |
| `keymap_commands.rs` | `list_launch_bindings`*, `open_active_keymap_file`*, `get_active_keymap`, `save_user_keymap`, `list_available_keymaps`, `load_keymap_by_name`, `get_active_application`, `reset_to_default` |

Events:

| Event | Payload | When |
|-------|---------|------|
| `macro11:device-status` | `{ connected }` | On change. `get_device_status` gives the current value on mount. |
| `macro11:key-event` | `{ keys: bool[11], layer }` | Every poll |
| `macro11:pot-value` | `{ value, layer }` | Every poll |
| `macro11:test-mode` | `{ enabled }` | On connect and on `set_test_mode` |
| `macro11:key-press` | `{ position, pressed, timestamp }` | Key edge. No UI listener. |
| `macro11:layer-change` | `{ layer, triggerApp }` | Host layer changes |
| `macro11:action-executed` | `{ position, layer, action }` | Action succeeded |
| `macro11:action-error` | `{ position, layer, error }` | Action failed |
| `macro11:firmware-progress` | `{ stage, fraction }` | During `update_firmware` |

## Firmware updates

The app bundles `src-tauri/firmware/{macro_eleven.uf2,manifest.json}`, written by `bundle-firmware.sh` and committed. `update_firmware` suspends the poll thread first, because macOS hidapi opens the device exclusively. `cargo run --example flash -- file.uf2` runs the same path from the CLI. Update sequence and release steps: [macro-eleven.md](../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md#firmware-updates-from-the-companion-app).

## Commands

```bash
pnpm dev:macro-eleven                              # from repo root: Vite HMR + Rust rebuild
pnpm --filter macro-eleven typecheck
cargo test -p macro-eleven                         # keymap parser, UF2, PICOBOOT framing, bundled firmware
```

## UI

- Dark theme (`class="dark"` on `<html>`), shadcn oklch tokens in `app/App.css`, green primary (hue 163).
- Window 800×600: sidebar nav plus content.

## Adding features

- Page: add it in `pages/`, a route in `app/App.tsx`, and a nav item in `shared/ui/NavBar.tsx`.
- Command: add it in `commands/*.rs`, register it in `lib.rs`, and add a wrapper in `shared/lib/tauri.ts`.
- Keymap field or action: change `shared/libs/keymap-schema` and `config/keymap.rs` together.
- HID message: extend `hid/protocol.rs` and the firmware. System commands go in `raw_hid_receive()` in `firmware/macro_eleven.c`; keymap commands go in `raw_hid_receive_keymap()` in `firmware/keymaps/apps/keymap.c`. Document the bytes in macro-eleven.md.
