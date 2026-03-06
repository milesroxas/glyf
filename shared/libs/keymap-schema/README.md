# @embedded/keymap-schema

Shared keymap schema for macropad projects in the embedded monorepo.

## Purpose

This package serves as the **single source of truth** for keymap structure across:
- Companion apps (Tauri/Electron)
- Firmware configuration tools
- Plugin ecosystems
- Community-contributed keymaps

## Usage

```typescript
import {
  Keymap,
  validateKeymap,
  MACRO_ELEVEN_DEFAULT_KEYMAP
} from '@embedded/keymap-schema';

// Load a keymap
const keymap: Keymap = JSON.parse(keymapJson);

// Validate it
if (validateKeymap(keymap)) {
  console.log('Valid keymap!');
}

// Use default keymap
const defaultKeymap = MACRO_ELEVEN_DEFAULT_KEYMAP;
```

## Schema Overview

```typescript
Keymap
├── version: string
├── name: string
├── device?: DeviceInfo
├── layers: Record<number, Layer>
│   └── Layer
│       ├── name: string
│       ├── triggerApp?: string
│       └── keys: Record<MatrixPositionKey, Action>
└── settings?: KeymapSettings

Action Types:
- cycle_layer: Cycle through layers
- switch_layer: Go to specific layer
- launch_app: Launch/focus application
- shortcut: Send keyboard shortcut
- macro: Execute sequence of actions
- plugin: Execute plugin action
- noop: No operation
```

## Design Principles

1. **Domain-Driven**: Models the actual hardware and user intent
2. **Extensible**: Plugin system for custom actions
3. **Type-Safe**: Full TypeScript type coverage
4. **Validated**: Runtime validation utilities included
5. **Versionable**: Semantic versioning for schema evolution

## File Format

Keymaps are stored as JSON files:

```json
{
  "version": "1.0.0",
  "name": "My Custom Keymap",
  "layers": {
    "0": {
      "name": "App Launcher",
      "keys": {
        "0,0": { "action": "cycle_layer" },
        "0,1": { "action": "launch_app", "app": "Chrome" }
      }
    }
  }
}
```

## Adding New Action Types

1. Add type to `ActionType` union in `types.ts`
2. Create interface extending `BaseAction`
3. Add to `Action` union type
4. Update validation in `validation.ts`
5. Implement executor in companion app

## Future: Plugin Actions

```json
{
  "action": "plugin",
  "pluginId": "spotify-controller",
  "actionId": "play_pause",
  "params": { "volume": 50 }
}
```

Plugins will be dynamically loaded TypeScript/WASM modules with standardized interfaces.
