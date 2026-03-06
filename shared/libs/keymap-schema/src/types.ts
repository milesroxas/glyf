/**
 * Keymap Schema - Single Source of Truth
 *
 * This schema defines the structure for all macropad keymaps in the monorepo.
 * Used by companion apps, firmware tools, and plugin systems.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Matrix position identifying a physical key
 */
export interface MatrixPosition {
  row: number;
  col: number;
}

/**
 * String representation of matrix position (e.g., "0,1")
 */
export type MatrixPositionKey = `${number},${number}`;

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  | 'cycle_layer'
  | 'switch_layer'
  | 'launch_app'
  | 'shortcut'
  | 'macro'
  | 'plugin'
  | 'noop';

/**
 * Base action interface
 */
export interface BaseAction {
  action: ActionType;
  label?: string;
  description?: string;
}

/**
 * Cycle through layers sequentially
 */
export interface CycleLayerAction extends BaseAction {
  action: 'cycle_layer';
}

/**
 * Switch to a specific layer
 */
export interface SwitchLayerAction extends BaseAction {
  action: 'switch_layer';
  layer: number;
}

/**
 * Launch an application by name or path
 */
export interface LaunchAppAction extends BaseAction {
  action: 'launch_app';
  app: string; // Application name or bundle identifier
  focusIfRunning?: boolean; // Default true
}

/**
 * Send keyboard shortcut
 */
export interface ShortcutAction extends BaseAction {
  action: 'shortcut';
  keys: string[]; // e.g., ["cmd", "shift", "p"]
  modifiers?: KeyModifier[];
}

/**
 * Execute a sequence of actions with timing
 */
export interface MacroAction extends BaseAction {
  action: 'macro';
  sequence: MacroStep[];
}

/**
 * Execute a plugin action
 */
export interface PluginAction extends BaseAction {
  action: 'plugin';
  pluginId: string;
  actionId: string;
  params?: Record<string, unknown>;
}

/**
 * No operation (unassigned key)
 */
export interface NoopAction extends BaseAction {
  action: 'noop';
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
// Macro Types
// ============================================================================

export type MacroStep =
  | { type: 'keydown'; key: string }
  | { type: 'keyup'; key: string }
  | { type: 'keypress'; key: string }
  | { type: 'shortcut'; keys: string[] }
  | { type: 'text'; text: string }
  | { type: 'wait'; ms: number };

export type KeyModifier = 'cmd' | 'ctrl' | 'alt' | 'shift' | 'fn';

// ============================================================================
// Layer Types
// ============================================================================

/**
 * A single layer containing key mappings
 */
export interface Layer {
  name: string;
  description?: string;

  /**
   * If set, this layer activates when the specified app is focused
   */
  triggerApp?: string;

  /**
   * Key mappings: matrix position -> action
   */
  keys: Record<MatrixPositionKey, Action>;

  /**
   * Layer-specific metadata (color, icon, etc.)
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Keymap Structure
// ============================================================================

/**
 * Complete keymap configuration
 */
export interface Keymap {
  version: string; // Semantic version (e.g., "1.0.0")
  name: string;
  description?: string;

  /**
   * Device this keymap is designed for (optional, for validation)
   */
  device?: {
    name: string;
    vendorId?: string;
    productId?: string;
    matrix?: {
      rows: number;
      cols: number;
    };
  };

  /**
   * Layers indexed by layer number
   */
  layers: Record<number, Layer>;

  /**
   * Global settings
   */
  settings?: KeymapSettings;

  /**
   * Metadata for the keymap file
   */
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    tags?: string[];
  };
}

export interface KeymapSettings {
  /**
   * Default layer when no app trigger matches
   */
  defaultLayer?: number;

  /**
   * Auto-switch layers based on active app
   */
  autoSwitchLayers?: boolean;

  /**
   * Debounce time in milliseconds
   */
  debounceMs?: number;

  /**
   * Plugin-specific settings
   */
  plugins?: Record<string, unknown>;
}

// ============================================================================
// Runtime Types (for Tauri/App communication)
// ============================================================================

/**
 * Key event from firmware
 */
export interface KeyEvent {
  position: MatrixPosition;
  pressed: boolean;
  timestamp: number;
}

/**
 * Active context for determining which layer to use
 */
export interface ActiveContext {
  activeApp?: string;
  activeAppBundleId?: string;
  currentLayer: number;
  timestamp: number;
}
