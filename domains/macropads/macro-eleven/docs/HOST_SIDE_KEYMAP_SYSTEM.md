# Host-Side Keymap System

## Overview

The Macro Eleven firmware no longer needs reflashing to change keymaps! We've implemented a **host-side keymap engine** that processes key events in the Tauri companion app.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Architecture Flow                        │
└─────────────────────────────────────────────────────────────────┘

Firmware (RP2040)                 Tauri App                    macOS
─────────────────                ───────────                  ───────

 ┌──────────┐                   ┌──────────┐
 │ Matrix   │ ─── Raw HID ────> │  HID     │
 │ Scan     │   (key state)     │ Protocol │
 └──────────┘                   └──────────┘
                                      │
                                      ▼
                                ┌──────────┐
                                │ Keymap   │ <─── Loads JSON
                                │ Engine   │      from disk
                                └──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐    ┌──────────┐
              │   App    │      │  Action  │    │  Layer   │
              │ Detector │      │ Executor │    │ Switcher │
              └──────────┘      └──────────┘    └──────────┘
                    │                 │                 │
                    └─────────────────┴─────────────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │  macOS   │
                               │   APIs   │
                               └──────────┘
```

### Key Components

1. **Firmware (RP2040)**: "Dumb" input device - reports raw key state via Raw HID
2. **Keymap Engine (Rust)**: Tracks state changes, determines active layer, executes actions
3. **App Detector (macOS)**: Detects active application for context-aware layers
4. **Action Executor (Rust)**: Launches apps, sends shortcuts, runs macros via AppleScript
5. **Keymap Storage (JSON)**: Configuration files in `~/.config/macro-eleven/keymaps/`

## Keymap File Format

Keymaps are JSON files following the `@glyf/keymap-schema`:

```json
{
  "version": "1.0.0",
  "name": "My Keymap",
  "layers": {
    "0": {
      "name": "App Launcher",
      "keys": {
        "0,0": { "action": "cycle_layer" },
        "0,1": { "action": "launch_app", "app": "Chrome" }
      }
    },
    "1": {
      "name": "Chrome Shortcuts",
      "triggerApp": "Google Chrome",
      "keys": {
        "0,1": { "action": "shortcut", "keys": ["cmd", "t"] }
      }
    }
  },
  "settings": {
    "autoSwitchLayers": true,
    "defaultLayer": 0
  }
}
```

## Action Types

| Action | Description | Example |
|--------|-------------|---------|
| `cycle_layer` | Cycle through layers | `{ "action": "cycle_layer" }` |
| `switch_layer` | Go to specific layer | `{ "action": "switch_layer", "layer": 2 }` |
| `launch_app` | Launch/focus app | `{ "action": "launch_app", "app": "Chrome" }` |
| `shortcut` | Send keyboard shortcut | `{ "action": "shortcut", "keys": ["cmd", "t"] }` |
| `macro` | Execute sequence | `{ "action": "macro", "sequence": [...] }` |
| `plugin` | Run plugin action | `{ "action": "plugin", "pluginId": "spotify" }` |
| `noop` | No operation | `{ "action": "noop" }` |

## File Locations

```
~/.config/macro-eleven/
├── keymaps/
│   ├── default.json         # Ships with app (auto-created)
│   ├── user-custom.json     # User modifications
│   └── *.json               # Additional keymaps
└── plugins/                 # Future: Plugin modules
```

**Priority:** `user-custom.json` > `default.json`

## Usage

### 1. No More Reflashing!

The firmware you flash ONCE (either `apps` or `via` build) never needs updating for keymap changes.

### 2. Editing Keymaps

**Option A: Via Companion App (Future)**
- UI to edit keymaps coming in next iteration

**Option B: Direct JSON Editing**
```bash
# Edit your keymap
nano ~/.config/macro-eleven/keymaps/user-custom.json

# Restart the companion app to reload
```

### 3. Adding New Apps

```json
{
  "layers": {
    "0": {
      "keys": {
        "1,0": {
          "action": "launch_app",
          "app": "My New App",
          "label": "MyApp"
        }
      }
    },
    "4": {
      "name": "My New App Shortcuts",
      "triggerApp": "My New App",
      "keys": {
        "0,1": { "action": "shortcut", "keys": ["cmd", "n"] }
      }
    }
  }
}
```

### 4. Creating Macros

```json
{
  "action": "macro",
  "sequence": [
    { "type": "shortcut", "keys": ["cmd", "k"] },
    { "type": "wait", "ms": 100 },
    { "type": "text", "text": "github.com" },
    { "type": "keypress", "key": "enter" }
  ]
}
```

## Benefits Over Firmware-Based Keymaps

✅ **No reflashing** - Change keymaps instantly
✅ **More powerful** - Can launch apps, run scripts, make HTTP requests
✅ **Context-aware** - Auto-switch layers based on active app
✅ **Easy to edit** - JSON files, not C code
✅ **Shareable** - Export/import keymap files
✅ **Extensible** - Plugin system for advanced features
✅ **Version controlled** - Track your keymap changes in git

## Migration from Firmware Keymaps

### Before (Required Reflashing)
```c
// firmware/keymaps/apps/keymap.c
[0] = LAYOUT(
    APP_CHROME, APP_FIGMA, BACK_HOME,
    // ...
)

// Change keymap = Rebuild + Reflash firmware (2-5 minutes)
```

### After (No Reflashing)
```json
// ~/.config/macro-eleven/keymaps/user-custom.json
{
  "layers": {
    "0": {
      "keys": {
        "0,1": { "action": "launch_app", "app": "Chrome" }
      }
    }
  }
}

// Change keymap = Edit JSON + Restart app (5 seconds)
```

## Future: Plugin System

Plugins will enable community-contributed actions:

```json
{
  "action": "plugin",
  "pluginId": "spotify-controller",
  "actionId": "play_pause"
}
```

Plugins are TypeScript/WASM modules with standardized interfaces:

```typescript
export const actions = {
  play_pause: async () => {
    await fetch('http://localhost:8080/spotify/play');
  }
};
```

## API Reference

### Tauri Commands

```typescript
// Get active keymap
const keymap = await invoke('get_active_keymap');

// Save user keymap
await invoke('save_user_keymap', { keymap });

// Get active application
const app = await invoke('get_active_application');

// Reset to default
await invoke('reset_to_default');
```

### Events

```typescript
// Individual key press/release
listen('macro11:key-press', (event) => {
  console.log(event.payload); // { position, pressed, timestamp }
});

// Layer changes
listen('macro11:layer-change', (event) => {
  console.log(event.payload); // { layer, triggerApp }
});

// Action executed
listen('macro11:action-executed', (event) => {
  console.log(event.payload); // { position, layer, action }
});
```

## Single Source of Truth

The keymap schema is defined in `/shared/libs/keymap-schema/` and shared across:
- TypeScript (frontend)
- Rust (backend)
- Documentation
- Community plugins

This ensures **no multiple sources of truth** and type-safe keymap handling throughout the stack.

## Troubleshooting

### Keymap not loading
```bash
# Check if default keymap exists
ls ~/.config/macro-eleven/keymaps/

# If missing, restart the app to auto-create
```

### App not launching
- Ensure app name matches exactly (case-sensitive)
- Try using bundle identifier instead: `"app": "com.google.Chrome"`

### Shortcuts not working
- Check modifier key names: `cmd`, `ctrl`, `alt`, `shift`
- macOS requires Accessibility permissions for System Events

## Next Steps

1. Build keymap editor UI (drag-drop app icons)
2. Add plugin system infrastructure
3. Create community keymap repository
4. Add keymap import/export
5. Build visual keymap designer
