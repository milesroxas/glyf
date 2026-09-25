/**
 * Keymap schema: the file format every macropad keymap uses.
 *
 * The Rust host mirrors these types in
 * `apps/macro-eleven/src-tauri/src/config/keymap.rs`. Both sides read the
 * shared JSON files in this package (default keymap, device layout, shortcut
 * tokens, fixtures), so a change here needs a matching change there.
 */

// ============================================================================
// Matrix positions
// ============================================================================

/** Matrix position identifying a physical key. */
export interface MatrixPosition {
  row: number;
  col: number;
}

/** String form of a matrix position, used as the key in `Layer.keys` ("0,1"). */
export type MatrixPositionKey = `${number},${number}`;

// ============================================================================
// Actions
// ============================================================================

export type ActionType =
  | "cycle_layer"
  | "switch_layer"
  | "launch_app"
  | "shortcut"
  | "macro"
  | "plugin"
  | "noop";

interface BaseAction {
  action: ActionType;
  /** Tile text. The designer caps it at 16 characters. */
  label?: string;
  description?: string;
  /** Lucide icon name for the tile and the rev 2 screen. */
  icon?: string;
}

/** Go to the next layer, in layer ID order, wrapping at the end. */
export interface CycleLayerAction extends BaseAction {
  action: "cycle_layer";
}

/** Go to a specific layer. */
export interface SwitchLayerAction extends BaseAction {
  action: "switch_layer";
  layer: number;
}

/** Open an app, or bring it to the front if it is running. */
export interface LaunchAppAction extends BaseAction {
  action: "launch_app";
  /** Display name. Also the launch fallback when `bundleId` is missing. */
  app: string;
  /** Launch target (macOS bundle identifier, e.g. "com.apple.Notes"). */
  bundleId?: string;
  /** Default true. False opens the app without bringing it to the front. */
  focusIfRunning?: boolean;
}

/**
 * Send a keyboard shortcut. `keys` is a flat token list: modifiers followed by
 * one key make a chord, and several chords make a sequence
 * (`["cmd", "k", "cmd", "s"]` is ⌘K then ⌘S). Tokens are listed in
 * `tokens.json`.
 */
export interface ShortcutAction extends BaseAction {
  action: "shortcut";
  keys: string[];
}

/** Run a list of steps in order. */
export interface MacroAction extends BaseAction {
  action: "macro";
  sequence: MacroStep[];
}

/** Run a plugin action. Reserved: the host does not run plugins yet. */
export interface PluginAction extends BaseAction {
  action: "plugin";
  pluginId: string;
  actionId: string;
  params?: Record<string, unknown>;
}

/** Do nothing. */
export interface NoopAction extends BaseAction {
  action: "noop";
}

export type Action =
  | CycleLayerAction
  | SwitchLayerAction
  | LaunchAppAction
  | ShortcutAction
  | MacroAction
  | PluginAction
  | NoopAction;

// ============================================================================
// Macros
// ============================================================================

export type MacroStep =
  | { type: "keydown"; key: string }
  | { type: "keyup"; key: string }
  | { type: "keypress"; key: string }
  | { type: "shortcut"; keys: string[] }
  | { type: "text"; text: string }
  | { type: "wait"; ms: number };

export type MacroStepType = MacroStep["type"];

/** Modifier tokens, in macOS display order. Aliases live in `tokens.json`. */
export type KeyModifier = "ctrl" | "option" | "shift" | "cmd";

// ============================================================================
// Layers and keymaps
// ============================================================================

export interface Layer {
  name: string;
  description?: string;
  /** App that activates this layer when it is in front (bundle ID or name). */
  triggerApp?: string;
  keys: Partial<Record<MatrixPositionKey, Action>>;
  metadata?: Record<string, unknown>;
}

export interface KeymapSettings {
  /** Layer to use when no layer's `triggerApp` matches the front app. */
  defaultLayer?: number;
  /** Follow the front app. Default true. */
  autoSwitchLayers?: boolean;
  plugins?: Record<string, unknown>;
}

export interface Keymap {
  /** Schema version (semver). */
  version: string;
  name: string;
  description?: string;
  device?: {
    name: string;
    vendorId?: string;
    productId?: string;
    matrix?: { rows: number; cols: number };
  };
  /** Layers by ID (0-255). Layer 0 always exists. */
  layers: Record<number, Layer>;
  settings?: KeymapSettings;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    tags?: string[];
  };
}

// ============================================================================
// Devices
// ============================================================================

/** Physical layout of a device. */
export interface DeviceDescriptor {
  name: string;
  vendorId: string;
  productId: string;
  matrix: { rows: number; cols: number };
  /** Every physical key as [row, col], in firmware bit order. */
  keys: [number, number][];
}
