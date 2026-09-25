# Glyf companion app

Features and run commands: [README.md](README.md). Repo-wide rules (FSD, typed IPC, theme tokens): [root CLAUDE.md](../../CLAUDE.md). Hardware, pinout, and wire protocol: [glyf.md](../../domains/glyf/display/docs/glyf.md). Open issues: [audit](../../docs/audit/2026-09-24-action-plan.md) Section B (GL-xx, GFW-xx).

## Stack

React 19, TypeScript, Vite, Tailwind v4, react-router-dom. Tauri v2 (Rust). Raw HID through the `hidapi` crate. Types from `@glyf/display-schema`.

## Frontend map

| Path | Holds |
|------|-------|
| `entities/` | `device`, `display`, `touch`: re-exports from `@glyf/display-schema`, no UI |
| `features/` | `display-preview`, `touch-monitor`, `settings`, `device-debug` |
| `pages/` | Routes `/` Display, `/touch`, `/settings`, `/debug` |
| `shared/lib/` | `tauri.ts` (command wrappers), `useDisplayState`, `useTouchEvents`, `utils` |
| `shared/ui/` | `NavBar`, `StatusBadge`, `button`, `card` |

## Backend map (`src-tauri/src/`)

| Path | Holds |
|------|-------|
| `lib.rs` | Command registration, state. `RUST_LOG=glyf_lib::hid=debug` for HID logs. |
| `commands/device.rs` | `detect_device_cmd`, `connect_device`, `disconnect_device`, `get_device_connection_snapshot`, `get_device_debug_snapshot`, `set_display_brightness`, `set_display_power`, `fill_display` |
| `commands/display.rs` | `get_display_config`, `save_display_config`, `reset_display_config` |
| `hid/connection.rs` | `HidConnection`: poll thread (~60 Hz) started by `connect_device`, auto-reconnect |
| `hid/protocol.rs` | 32-byte report build/parse (unit-tested) |
| `config/display_config.rs` | `GlyfConfig`, `DisplayConfig`, `TouchCalibration`: serde mirror of `display-schema` |
| `config/storage.rs` | JSON load/save at `~/.config/glyf/config.json` |

Events: `glyf:device-status`, `glyf:display-state`, `glyf:touch-event`.

Config fields `orientation`, `colorDepth`, and `sleepAfterMs` are saved but never sent to the device (audit GL-09).

## Commands

```bash
pnpm dev:glyf                              # from repo root: Vite HMR + Rust rebuild
pnpm --filter ./apps/glyf typecheck
pnpm test                                  # includes this app's jsdom and browser tests
cargo test -p glyf                         # protocol tests
```

## UI

- Dark theme (`class="dark"` on `<html>`), shadcn oklch tokens in `app/App.css`, purple primary (hue 270) to tell it apart from Macro Eleven's green.
- Window 900×640: sidebar nav plus content.

## Adding features

- Page: add it in `pages/`, a route in `app/App.tsx`, and a nav item in `shared/ui/NavBar.tsx`.
- Command: add it in `commands/*.rs`, register it in `lib.rs`, and add a wrapper in `shared/lib/tauri.ts`.
- Type: add it to `shared/libs/display-schema/src/types.ts`. Mirror it in Rust if it is serialized.
- HID message: extend `hid/protocol.rs` and firmware `src/hid/hid_handler.c`. Document the bytes in glyf.md.
