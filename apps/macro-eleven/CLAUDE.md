# Macro Eleven companion app

Features and run commands: [README.md](README.md). Repo-wide rules (FSD, typed IPC, theme tokens): [root CLAUDE.md](../../CLAUDE.md). Device hardware and wire protocol: [macro-eleven.md](../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md). Key-to-action behavior: [docs/keymap-engine.md](docs/keymap-engine.md).

Open work: the [audit](../../docs/audit/2026-09-24-action-plan.md) (ME-xx, UI-xx, LINK-xx). Check it before changing the connection thread or the firmware protocol.

## Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui on `radix-ui` (`components.json`), react-router-dom, `motion` (springs, gestures), `sonner` (toasts), `cmdk` (app picker). Tauri v2 (Rust) with the opener, dialog, and global-shortcut plugins, the tray icon, and `macOSPrivateApi` (see-through windows). AppKit through `objc2` for Liquid Glass, fades, the panel, and Open at Login (`objc2-service-management`). Raw HID through the `hidapi` crate. Keymap format, shortcut tokens, device layout, edit operations, and validation from `@glyf/keymap-schema`.

## Frontend map

| Path | Holds |
|------|-------|
| `entities/` | `keymap` (profile and engine types, layer names), `action` (kinds, labels, spoken descriptions, result messages), `app` (installed apps, picker ranking), `key`, `device`, `firmware`, `settings` (app settings, login item, backdrop, the glass tint curve) |
| `features/keymap-designer/` | The designer. `model/` holds state: `KeymapProvider` (the one place edits happen), `history` (undo that returns to the edited key), `useAutosave` (300 ms trailing, serialized), `profileActions`, keyboard shortcuts, press-to-select. `canvas/`, `inspector/`, `editors/`, `layers/`, `profiles/`, `apps/` (picker, recent apps, drag onto keys). |
| `features/` (others) | `key-tester` (Diagnostics page), `pot-monitor` (Knob page), `overlay` (glass tint, idle fade), `firmware-update`, `settings` (the Settings window: panes, grouped rows, overlay shortcut rule), `menu-bar-panel` (the panel under the menu bar icon: live pad, profiles, overlay switch, first-close tip) |
| `pages/` | Routes `/` Designer, `/diagnostics`, `/knob`, `/firmware`. `/designer`, `/layers`, `/pot` redirect. The other windows load the same page with a hash: `#/overlay`, `#/panel`, `#/settings` (`app/App.tsx`). |
| `shared/config/layout.ts` | `KEY_POSITIONS`, `MATRIX_LAYOUT`, `matrixToIndex`, `neighborKey`, derived from the shared device file |
| `shared/lib/` | `tauri.ts` (every command and event wrapper), `motion.ts` (spring and easing tokens), event hooks (`useDeviceStatus`, `useKeyEvents`, `usePotValue`, `useActiveKeymap`), `useSettings` (app settings across windows), `useLoginItem`, `useAccessibilityPermission`, `useFitToContent` (a window sizes itself to its page), `usePageVisible`, `useInstalledApps` (loaded once per window), `storage.ts` (per-window conveniences in localStorage) |
| `shared/ui/` | The pad, drawn the same everywhere: `MacropadGrid` and `pad.css` (every length follows `--key`, the key width), `Keycap` (designer, overlay, and Diagnostics), `KeyLegend` (what a key does, from `keyFace` in `entities/action`), `KnobDial`, `AppIcon`. Also `Segmented` (switches panels), `SegmentedChoice` (picks a value), `ShortcutRecorder`, and shadcn primitives (checkbox, dialog, popover, dropdown-menu, select, slider, switch, tooltip, toaster, …) |
| `test/` | Vitest setup and `fakeBackend.ts`, a fake host at the IPC layer (`@tauri-apps/api/mocks`) |

## Backend map (`src-tauri/src/`)

| Path | Holds |
|------|-------|
| `lib.rs` | Setup: profile store (and the one-time migration), engine, app catalog, HID poll thread, the shell; command registration; window and run events (close hides, Dock click reopens) |
| `config/` | `keymap.rs` (serde mirror of the schema; keeps unknown fields; `validate` runs the same checks as `assertKeymap`), `profiles.rs` (profile files, names, import/export, migration), `settings.rs` (app settings in `preferences.json`, overlay frame and one-time tips in `window-state.json`), `storage.rs` (atomic writes), `device.rs` and `tokens.rs` (read the shared JSON files) |
| `shell/` | Everything around the engine: `windows.rs` (designer and Settings hide on close; the Dock icon shows while one is open, or always without the menu bar icon), `tray.rs` (menu bar icon, template images in `icons/tray/`, layer title), `panel.rs` (the menu bar panel: placement under the icon, show, hide on blur), `overlay.rs` (overlay window, glass or solid, idle fade, remembered frame and its reset), `menu.rs` (Settings… ⌘, in the app menu; shared item IDs), `shortcut.rs` (overlay shortcut from shortcut tokens), `macos.rs` (AppKit: `NSGlassEffectView`, window fades, the non-activating panel class, top-anchored resize, `SMAppService`, login-launch detection) |
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
| `overlay.rs` | `set_overlay_visible`, `get_backdrop(surface)`, `refresh_overlay_backdrop`, `set_overlay_dimmed`, `reset_overlay_frame` |
| `settings.rs` | `get_settings`, `update_settings(patch)` (applies at once, emits `macro11:settings-changed`), `get_login_item`, `set_login_item`, `open_login_items_settings`, `pause_overlay_shortcut` |
| `shell.rs` | `show_main_window(route)`, `show_settings_window`, `fit_settings_window(height)`, `fit_panel(height)`, `hide_panel`, `quit_app` |

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
| `macro11:settings-changed` | `Settings` | Any window changed a setting |
| `macro11:panel-shown` | `{ tip, backdrop }` | The menu bar panel opened. `tip` is the one-time first-close tip. |
| `macro11:navigate` | route | The designer should show a page (the panel's Update Firmware…) |
| `macro11:overlay-material` | `"glass"` or `"solid"` | The overlay's backdrop changed |
| `macro11:overlay-preview` | transparency | Settings' slider is moving (not saved) |

## Knob volume

Under host control the knob sets the system output volume; the firmware sends no volume keys. `engine/knob.rs` runs on its own thread and applies only the newest reading. A turn covers the distance left to the stop it turns toward, so the knob and the volume meet at the stops and then track 1:1. The volume never jumps, even after the volume keys or the menu bar change it. Like the volume keys, it plays the system feedback sound through the output (when Sound > "Play feedback when volume is changed" is on): once per 1/16 of volume moved, and once when the knob stops for 150 ms. The poll thread passes readings only from firmware 1.1.2 or later (`HOST_KNOB_FIRMWARE` in `hid/connection.rs`); older firmware still taps volume keys.

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
- Window 1000×680 (minimum 900×600): 224 px sidebar plus content. The designer shows the inspector beside the pad when there is room (760 px of content) and as a bottom sheet otherwise. The pad scales with the canvas: square keys from 64 px to 104 px (about life size).
- Overlay window (`shell/overlay.rs`, `features/overlay/`): the window is the pad's chassis. On macOS its content runs under a hidden title bar with the window buttons over it, and every part of it drags the window. The key size fits the window; its default and minimum sizes derive from the same numbers. Glass puts `NSGlassEffectView` (HUD vibrancy before macOS 26) behind a see-through page that paints only a tint (`glassTint`); Solid paints the chassis. Reduce Transparency forces Solid. The idle fade is the host's window alpha, so the glass fades with the keys.
- Menu bar and windows: closing never quits; the pad works only while the app runs. The designer and Settings hide on close, and the Dock icon shows only while one is open (`dockIcon` setting). With the menu bar icon hidden, the Dock icon stays at all times, so the app is never out of reach. A login launch stays in the menu bar. The first time the designer closes, the panel opens with a one-time tip and Open at Login.
- Menu bar panel (`shell/panel.rs`, `features/menu-bar-panel/`): a borderless window turned into a non-activating `NSPanel` at launch and kept hidden, so it opens at once and never brings the designer forward. It opens on mouse down under the icon (the icon stays highlighted), closes on blur, Esc, or a second click, and sizes itself to its page (`useFitToContent`). Arrow keys move between items.
- Settings window (`shell/windows.rs`, `features/settings/`): toolbar panes, the pane's name in the title bar, System Settings-style grouped rows, changes apply at once. It opens at its first pane's measured height and animates between panes with the top edge still.
- Motion: springs from `shared/lib/motion.ts` for anything the user can interrupt (selection ring, tab indicator, sheet, drag); floating surfaces share the `.pop` enter/exit in `App.css`; content swaps cross-fade. `MotionConfig reducedMotion="user"` plus CSS media queries honor Reduce Motion and Reduce Transparency (`material` utilities).

## Adding features

- Page: add it in `pages/`, a route in `app/App.tsx`, and a nav item in `shared/ui/NavBar.tsx`.
- Command: add it in `commands/*.rs`, register it in `lib.rs`, and add a wrapper in `shared/lib/tauri.ts`.
- Setting: add the field to `config/settings.rs` (with its default) and `entities/settings.ts`, apply it in `shell::apply_settings`, add a row to a pane in `features/settings/`, and a default to `test/fakeBackend.ts`.
- Keymap field or action: change `shared/libs/keymap-schema` (types, validation, and a fixture) and `config/keymap.rs` together.
- Shortcut key: add it to `tokens.json`; the Rust parity tests fail until `shortcuts.rs` and `macos.rs` handle it.
- Designer edit: write it as a pure function over `Keymap` (the schema's `edit.ts` if it is general) and apply it with `edit()` from `KeymapProvider`. Read input values before calling `edit`; the edit can run later, after Default is duplicated.
- HID message: extend `hid/protocol.rs` and the firmware. System commands go in `raw_hid_receive()` in `firmware/macro_eleven.c`; keymap commands go in `raw_hid_receive_keymap()` in `firmware/keymaps/apps/keymap.c`. Document the bytes in macro-eleven.md.
