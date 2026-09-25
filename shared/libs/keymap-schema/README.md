# @glyf/keymap-schema

The keymap format for Glyf macropads, and everything that needs to agree on it: types, the shortcut vocabulary, device layouts, the bundled default keymap, pure edit operations, and validation.

The Macro Eleven app's Rust host reads the same JSON files (`include_str!`) and runs the same test fixtures, so the TypeScript and Rust sides cannot drift apart silently.

## Contents

| File | Holds |
|------|-------|
| `src/types.ts` | `Keymap`, `Layer`, `Action` (and each action type), `MacroStep`, `DeviceDescriptor` |
| `src/tokens.json` | Every shortcut token: modifiers and keys, their aliases, macOS glyphs, spoken names, and `KeyboardEvent.code` values |
| `src/shortcut.ts` | `parseShortcut`, `isValidShortcutKeys`, `formatShortcut` (`["cmd", "shift", "t"]` → `["⇧⌘T"]`), `describeShortcut`, `codeToToken`, `isSameShortcut` |
| `src/macro-eleven.device.json`, `src/device.ts` | Macro Eleven's physical keys in firmware bit order (`MACRO_ELEVEN`) |
| `src/macro-eleven.default.json`, `src/defaults.ts` | The bundled default keymap (`MACRO_ELEVEN_DEFAULT_KEYMAP`) |
| `src/edit.ts` | Immutable edits: `setKeyAction`, `clearKey`, `setLabel`, `addLayer`, `renameLayer`, `duplicateLayer`, `deleteLayer`, `moveLayer`, `setLayerTrigger`, `setAutoSwitchLayers`, and `findShortcutConflict` |
| `src/validation.ts` | `assertKeymap` |
| `fixtures/valid`, `fixtures/invalid` | Keymaps both test suites must accept or reject |

## Usage

```typescript
import {
  assertKeymap,
  formatShortcut,
  MACRO_ELEVEN_DEFAULT_KEYMAP,
  setLabel,
} from "@glyf/keymap-schema";

const keymap: unknown = JSON.parse(json);
assertKeymap(keymap); // throws KeymapValidationError naming the first problem

const renamed = setLabel(keymap, 0, "0,1", "Browser"); // a new keymap; `keymap` is unchanged
formatShortcut(["cmd", "k", "cmd", "s"]); // ["⌘K", "⌘S"]
```

## Format

```json
{
  "version": "1.0.0",
  "name": "My keymap",
  "layers": {
    "0": {
      "name": "App Launcher",
      "keys": {
        "0,1": { "action": "launch_app", "app": "Google Chrome", "bundleId": "com.google.Chrome", "label": "Chrome" }
      }
    },
    "1": {
      "name": "Chrome",
      "triggerApp": "com.google.Chrome",
      "keys": {
        "0,1": { "action": "shortcut", "keys": ["cmd", "t"], "label": "New Tab" }
      }
    }
  },
  "settings": { "autoSwitchLayers": true }
}
```

- Layer IDs are whole numbers 0–255, and layer 0 must exist.
- Keys are `"row,col"` positions inside the device's matrix. A cell without a switch (Macro Eleven's `0,3`) is allowed; its key never fires.
- A shortcut's `keys` are modifiers followed by one key; several chords make a sequence (`["cmd", "k", "cmd", "s"]` is ⌘K then ⌘S).
- `triggerApp` is a bundle ID or an app name. The host uses the lowest layer whose trigger matches the front app.
- Action types: `launch_app`, `shortcut`, `macro` (steps `shortcut`, `text`, `wait`, `keydown`, `keyup`, `keypress`), `switch_layer`, `cycle_layer`, `noop`, and `plugin` (reserved).
- Unknown fields are kept when the host loads and saves a keymap.

## Changing the format

1. Change `types.ts` and the checks in `validation.ts`.
2. Add a fixture under `fixtures/valid` or `fixtures/invalid`.
3. Mirror the change in the host's `src-tauri/src/config/keymap.rs`. `cargo test` runs the same fixtures.

New shortcut keys go in `tokens.json`; the host's parity tests fail until it can parse and send them.
