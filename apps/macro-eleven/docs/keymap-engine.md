# Keymap engine

How the Macro Eleven app turns key presses into actions. The firmware only reports key state. The app decides what each key does, so a keymap change never needs a reflash.

> This page describes the code on `main`. The [Keymap Designer plan](../../../docs/plans/2026-09-25-keymap-designer.md) replaces JSON editing and `user-custom.json` with in-app editing and named profiles.

## Flow

```
Firmware (RP2040)             App (Rust)                                       macOS
─────────────────             ──────────                                       ─────
0x01 poll reply:        ──>   hid/connection.rs poll thread (~60 Hz)
11-bit key bitmask,             └─ hid/keymap_engine.rs: diff key state, pick layer
pot value, layer                     └─ executor/actions.rs (thread per press) ──>  CGEvent, osascript
```

The wire format is in [macro-eleven.md § Raw HID protocol](../../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md#raw-hid-protocol). Events and commands are listed in [CLAUDE.md](../CLAUDE.md#ipc).

## Host control

On connect the app sends `SET_TEST_MODE` (`0x02`) with enable = 1. While host control is on:

- the firmware suppresses its own keycodes;
- the app runs the action for each key press;
- the app switches layers by itself.

The Key Tester page has a switch to turn host control off, so the firmware's own `apps` keymap runs. The code calls this "test mode"; audit ME-03 renames it to `host_control`.

Known issue: the firmware boots with host control on, and the app never releases it on quit. Without the app running, the pad types nothing (audit ME-03, FW-01).

## Keymap files

The file format is the [`@glyf/keymap-schema`](../../../shared/libs/keymap-schema/README.md) schema.

| File | Role |
|------|------|
| `~/.config/macro-eleven/keymaps/default.json` | Written from the bundled default on first launch. Never updated after that. |
| `~/.config/macro-eleven/keymaps/user-custom.json` | Used instead of `default.json` when it exists. Layer Viewer → **Edit Keymap JSON** creates it and opens it. |

After you edit a file, press **Reload Keymap** in Layer Viewer. `save_user_keymap` writes the file but does not reload the engine.

## Layer selection

- `switch_layer` and `cycle_layer` set a manual override.
- `launch_app` clears the override.
- Without an override, and with `settings.autoSwitchLayers` on (Rust default: `true`), the engine picks the layer whose `triggerApp` matches the frontmost app.

## Actions

| Action | How it runs | Needs |
|--------|-------------|-------|
| `shortcut`, `macro` | CGEvent key events | Accessibility permission |
| `launch_app` | `osascript`: `tell application "<app>" to activate` (`launch` when `focusIfRunning` is `false`) | Automation permission |
| `switch_layer`, `cycle_layer` | Engine state | None |
| `plugin` | Not implemented. Returns an error. | None |
| `noop` | Nothing | None |

Shortcut modifier tokens: `cmd` (`command`, `meta`, `super`), `ctrl` (`control`), `alt`, `option` (`opt`), `shift`. Primary key tokens are in `src-tauri/src/executor/runtime/shortcuts.rs`. Keycodes assume a US ANSI layout.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Key press does nothing | Check that the status badge says Connected and host control is on (Key Tester). |
| `action-executed` fires, but no shortcut arrives | Grant Accessibility to the app in System Settings → Privacy & Security. Without it, macOS drops the events and reports no error. |
| App does not launch | `app` must be the application name as macOS knows it (case-sensitive). Bundle IDs do not work yet. |
| Keymap will not load | Delete `default.json`. The app writes it again on the next launch. |
