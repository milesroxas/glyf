# Macro Eleven companion app

Features and run commands: [README.md](README.md). Repo-wide rules (FSD, typed IPC, theme tokens): [root CLAUDE.md](../../CLAUDE.md). Device hardware and wire protocol: [macro-eleven.md](../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md). Key-to-action behavior: [docs/keymap-engine.md](docs/keymap-engine.md).

Open work: the [audit](../../docs/audit/2026-09-24-action-plan.md) (ME-xx, UI-xx, LINK-xx). Check it before changing the connection thread or the firmware protocol.

## Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui on `radix-ui` (`components.json`), react-router-dom, `motion` (springs, gestures), `sonner` (toasts), `cmdk` (app picker). Tauri v2 (Rust) with the opener and dialog plugins. Raw HID through the `hidapi` crate. Keymap format, shortcut tokens, device layout, edit operations, and validation from `@glyf/keymap-schema`.

## Frontend map

| Path | Holds |
|------|-------|
| `entities/` | `keymap` (profile and engine types, layer names), `action` (kinds, labels, spoken descriptions, result messages), `app` (installed apps, picker ranking), `key`, `device`, `firmware` |
| `features/keymap-designer/` | The designer. `model/` holds state: `KeymapProvider` (the one place edits happen), `history` (undo that returns to the edited key), `useAutosave` (300 ms trailing, serialized), `profileActions`, keyboard shortcuts, press-to-select. `canvas/`, `inspector/`, `editors/`, `layers/`, `profiles/`, `apps/` (picker, icons, drag onto keys). |
| `features/` (others) | `key-tester` (Diagnostics page), `pot-monitor` (Knob page), `overlay`, `firmware-update` |
| `pages/` | Routes `/` Designer, `/diagnostics`, `/knob`, `/firmware`. `/designer`, `/layers`, `/pot` redirect. `#/overlay` renders the overlay window. |
| `shared/config/layout.ts` | `KEY_POSITIONS`, `MATRIX_LAYOUT`, `matrixToIndex`, `neighborKey`, derived from the shared device file |
| `shared/lib/` | `tauri.ts` (every command and event wrapper), `motion.ts` (spring and easing tokens), event hooks (`useDeviceStatus`, `useKeyEvents`, `usePotValue`), `storage.ts` (per-user preferences) |
| `shared/ui/` | `MacropadGrid`, `Keycap` (one key look for designer, overlay, and Diagnostics), `KnobDial`, `Segmented`, shadcn primitives (dialog, popover, dropdown-menu, select, slider, switch, tooltip, toaster, …) |
| `test/` | Vitest setup and `fakeBackend.ts`, a fake host at the IPC layer (`@tauri-apps/api/mocks`) |

## Backend map (`src-tauri/src/`)

| Path | Holds |
|------|-------|
| `lib.rs` | Setup: profile store (and the one-time migration), engine, app catalog, HID poll thread; command registration |
| `config/` | `keymap.rs` (serde mirror of the schema; keeps unknown fields; `validate` runs the same checks as `assertKeymap`), `profiles.rs` (profile files, names, import/export, migration), `storage.rs` (atomic writes), `device.rs` and `tokens.rs` (read the shared JSON files) |
| `engine/` | `KeymapEngine`: key edges, layer rules, hot reload, the front-app thread; `events.rs` (UI events, behind a trait for tests); `knob.rs` (knob to system volume) |
| `executor/` | `worker.rs` (the single action thread), `actions.rs` (runs actions; macros release held modifiers), `runtime/` per OS (`macos.rs` CGEvent + `open`), `permissions.rs` (Accessibility), `app_detector.rs` (front app), `volume/` (system output volume; `macos.rs` CoreAudio) |
| `apps/` | Installed apps: bundle scanning (`plist`), icons rendered by AppKit and cached |
| `hid/` | `connection.rs` (poll thread ~60 Hz from launch, auto-reconnect, `suspend()` for firmware updates; emits input events on change), `protocol.rs` |
| `firmware/` | Update path: `bundle.rs`, `updater.rs`, `picoboot.rs`, `mass_storage.rs`, `uf2.rs`, `version.rs` |
| `commands/` | Tauri commands, below |

The shared JSON files (`shared/libs/keymap-schema/src/`: default keymap, device layout, shortcut tokens) are compiled in with `include_str!`. Tests in both languages run the same fixtures in `shared/libs/keymap-schema/fixtures/`.

## IPC

Every command has a wrapper in `shared/lib/tauri.ts`. Keymap and profile commands run off the main thread.

| File | Commands |
|------|----------|
| `profiles.rs` | `list_profiles`, `get_profile`, `save_profile` (validates; reloads the engine for the active profile), `create_profile`, `rename_profile`, `delete_profile`, `set_active_profile`, `import_profile`, `export_profile`, `reveal_profiles_dir` |
| `engine.rs` | `get_engine_snapshot` (`{ layer, activeProfile, hostControl, connected }`), `run_action` (the designer's Try, on the action thread), `get_permissions`, `open_accessibility_settings` |
| `apps.rs` | `list_installed_apps(refresh)`, `describe_app(path)` |
| `device.rs` | `get_device_status`, `set_test_mode` |
| `firmware.rs` | `get_firmware_status`, `update_firmware` |
| `overlay.rs` | `open_overlay_window` |

Events:

| Event | Payload | When |
|-------|---------|------|
| `macro11:device-status` | `{ connected }` | On change. `get_device_status` gives the current value on mount. |
| `macro11:key-event` | `{ keys: bool[11], layer }` | When key state or the firmware layer changes |
| `macro11:pot-value` | `{ value, layer }` | When the value changes |
| `macro11:test-mode` | `{ enabled }` | On connect and on `set_test_mode` |
| `macro11:key-press` | `{ position, pressed, timestamp }` | Key edge. The designer selects the pressed key. |
| `macro11:layer-change` | `{ layer, triggerApp }` | Host layer changes |
| `macro11:action-executed` | `{ position, layer, action }` | A key's action succeeded |
| `macro11:action-error` | `{ position, layer, error }` | A key's action failed |
| `macro11:keymap-changed` | `{ profile, source }` | The active profile was saved or switched. `source` is the window that did it. |
| `macro11:firmware-progress` | `{ stage, fraction }` | During `update_firmware` |

## Knob volume

Under host control the knob sets the system output volume; the firmware sends no volume keys. `engine/knob.rs` runs on its own thread and applies only the newest reading. A turn covers the distance left to the stop it turns toward, so the knob and the volume meet at the stops and then track 1:1. The volume never jumps, even after the volume keys or the menu bar change it. The poll thread passes readings only from firmware 1.1.2 or later (`HOST_KNOB_FIRMWARE` in `hid/connection.rs`); older firmware still taps volume keys.

## Firmware updates

The app bundles `src-tauri/firmware/{macro_eleven.uf2,manifest.json}`, written by `bundle-firmware.sh` and committed. `update_firmware` suspends the poll thread first, because macOS hidapi opens the device exclusively. `cargo run --example flash -- file.uf2` runs the same path from the CLI. Update sequence and release steps: [macro-eleven.md](../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md#firmware-updates-from-the-companion-app).

## Commands

```bash
pnpm dev:macro-eleven                              # from repo root: Vite HMR + Rust rebuild
pnpm --filter macro-eleven typecheck
pnpm exec vitest run --project macro-eleven        # designer, recorder, layout, ranking
cargo test -p macro-eleven                         # profiles, engine, executor, validation fixtures, UF2, PICOBOOT
```

## UI

- Dark theme (`class="dark"` on `<html>`), shadcn oklch tokens in `app/App.css`, green primary (hue 163), `--warning` for inline warnings.
- Window 1000×680 (minimum 900×600): 224 px sidebar plus content. The designer shows the inspector beside the pad when there is room (760 px of content) and as a bottom sheet otherwise.
- Motion: springs from `shared/lib/motion.ts` for anything the user can interrupt (selection ring, tab indicator, sheet, drag); floating surfaces share the `.pop` enter/exit in `App.css`; content swaps cross-fade. `MotionConfig reducedMotion="user"` plus CSS media queries honor Reduce Motion and Reduce Transparency (`material` utilities).

## Adding features

- Page: add it in `pages/`, a route in `app/App.tsx`, and a nav item in `shared/ui/NavBar.tsx`.
- Command: add it in `commands/*.rs`, register it in `lib.rs`, and add a wrapper in `shared/lib/tauri.ts`.
- Keymap field or action: change `shared/libs/keymap-schema` (types, validation, and a fixture) and `config/keymap.rs` together.
- Shortcut key: add it to `tokens.json`; the Rust parity tests fail until `shortcuts.rs` and `macos.rs` handle it.
- Designer edit: write it as a pure function over `Keymap` (the schema's `edit.ts` if it is general) and apply it with `edit()` from `KeymapProvider`. Read input values before calling `edit`; the edit can run later, after Default is duplicated.
- HID message: extend `hid/protocol.rs` and the firmware. System commands go in `raw_hid_receive()` in `firmware/macro_eleven.c`; keymap commands go in `raw_hid_receive_keymap()` in `firmware/keymaps/apps/keymap.c`. Document the bytes in macro-eleven.md.
