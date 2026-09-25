# Keymap engine

How the Macro Eleven app turns key presses into actions. The firmware only reports key state. The app decides what each key does, so a keymap change never needs a reflash: an edit in the Keymap Designer reaches the pad as soon as it is saved.

## Flow

```
Firmware (RP2040)            App (Rust)                                          macOS
─────────────────            ──────────                                          ─────
0x01 poll reply:       ──>   hid/connection.rs poll thread (~60 Hz)
11-bit key bitmask,            └─ engine/mod.rs: key edges, layer rules (one lock, memory only)
pot value, layer                    ├─ layer actions run inline
                                    └─ executor/worker.rs: one action thread, in order ──>  CGEvent, open
engine/mod.rs front-app thread (every 250 ms) ──> layer follows the front app
```

The wire format is in [macro-eleven.md § Raw HID protocol](../../../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md#raw-hid-protocol). Commands and events are listed in [CLAUDE.md](../CLAUDE.md#ipc).

Actions that talk to macOS (opening apps, keystrokes, macros) run one at a time on a single worker thread. Key presses and the designer's **Try** button share that queue, so a slow action never stalls the poll thread and two actions never interleave keystrokes.

## Host control

On connect the app sends `SET_TEST_MODE` (`0x02`) with enable = 1. While host control is on:

- the firmware suppresses its own keycodes;
- the app runs the action for each key press;
- the app switches layers by itself.

The Diagnostics page has a switch to turn host control off, so the firmware's own `apps` keymap runs. The code calls this "test mode"; audit ME-03 renames it to `host_control`.

Known issue: the firmware boots with host control on, and the app never releases it on quit. Without the app running, the pad types nothing (audit ME-03, FW-01).

## Profiles

A profile is one keymap, in the [`@glyf/keymap-schema`](../../../shared/libs/keymap-schema/README.md) format. The Keymap Designer edits the active profile; the engine always runs it.

| Location (macOS) | Holds |
|------------------|-------|
| `~/Library/Application Support/com.milesroxas.macro-eleven/profiles/<name>.json` | One file per profile |
| `~/Library/Application Support/com.milesroxas.macro-eleven/settings.json` | `{ "activeProfile": "<name>" }` |
| `~/Library/Caches/com.milesroxas.macro-eleven/icons/` | App icons for the picker, rendered once |

- **Default** is the bundled keymap. It is read-only and never written to disk. Editing it offers to duplicate it first.
- Saves are atomic (write a temporary file, then rename), validated, and keep fields the app does not know.
- Saving or switching the active profile swaps the engine's keymap at once and emits `macro11:keymap-changed`.
- On first launch, a keymap from the old location (`~/.config/macro-eleven/keymaps/user-custom.json`) becomes the profile "My keymap".
- Profile names use letters, numbers, spaces, `-` and `_` (1–48 characters).

## Layer selection

- `switch_layer` goes to that layer; a layer that does not exist is an error. `cycle_layer` goes to the next layer ID, wrapping to the first.
- Both set a manual override. The override ends when the front app changes, when a `launch_app` key runs, or when the keymap is saved.
- Without an override, and with `settings.autoSwitchLayers` on (the default), the engine picks the lowest layer whose `triggerApp` matches the front app's bundle ID or name. With no match it uses `settings.defaultLayer` if set, else stays put.

## Actions

| Action | How it runs | Needs |
|--------|-------------|-------|
| `launch_app` | `open -b <bundleId>`, falling back to `open -a <app>`. `focusIfRunning: false` adds `-g`. | Nothing |
| `shortcut` | CGEvent key events, one chord after another | Accessibility |
| `macro` | Steps in order. Modifiers held by `keydown` apply to later keys and are released when the macro ends, even if a step fails. Text is typed as Unicode, independent of the keyboard layout. | Accessibility |
| `switch_layer`, `cycle_layer` | Engine state | Nothing |
| `plugin` | Not available yet. Returns an error. | – |
| `noop` | Nothing | – |

Without Accessibility access, shortcuts and macros fail with a message naming the permission, and the designer shows a banner that opens System Settings.

The shortcut vocabulary (modifier and key tokens, their aliases, and their macOS glyphs) is [`tokens.json`](../../../shared/libs/keymap-schema/src/tokens.json). Keycodes for shortcut keys assume a US ANSI layout.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Key press does nothing | Check that the status badge says Connected and host control is on (Diagnostics). |
| Shortcuts fail with an Accessibility error | System Settings → Privacy & Security → Accessibility: turn on Macro Eleven. The designer's banner links there. |
| App does not open | Choose the app again in the designer so the key stores its bundle ID. |
| A profile will not load | The app falls back to Default and keeps the file. Fix or delete it in the profiles folder (profile menu → Show Profiles in Finder). |

## Not yet

- **Plugins.** `plugin` actions load and save but do not run. The designer shows such a key as read-only "Plugin (unavailable)".
- **Rev 2 screen.** A key's `label` (16 characters in the designer) and `icon` are the tile contract for the screen composer (audit SCR-05); app icons come from the same catalog as the picker.
- **Windows.** App listing and launching are behind `#[cfg(target_os)]`; `WindowsRuntime` returns "not implemented". The designer itself is platform-neutral.
- **Other devices.** Keymaps are validated against Macro Eleven's layout. A Four Pad designer needs a layout per device (`DeviceDescriptor` in the schema).
