/**
 * Keymap entity - Domain model for macro-eleven keymaps
 *
 * Re-exports types from shared schema and adds app-specific helpers
 */

import type {
  Action,
  ActiveContext,
  Keymap,
  Layer,
  MatrixPositionKey,
} from "@glyf/keymap-schema";

import {
  formatMatrixPosition,
  MACRO_ELEVEN_DEFAULT_KEYMAP,
  parseMatrixPosition,
  validateKeymap,
} from "@glyf/keymap-schema";

// Re-export types
export type { Action, ActiveContext, Keymap, Layer, MatrixPositionKey };

// Re-export utilities
export {
  formatMatrixPosition,
  MACRO_ELEVEN_DEFAULT_KEYMAP,
  parseMatrixPosition,
  validateKeymap,
};

export interface LaunchBinding {
  app: string;
  label: string | null;
  layer: number;
  layerName: string;
  row: number;
  col: number;
}

/**
 * Get action for a key in a specific layer
 */
export function getActionForKey(
  keymap: Keymap,
  layer: number,
  row: number,
  col: number,
): Action | null {
  const layerData = keymap.layers[layer];
  if (!layerData) return null;

  const posKey = formatMatrixPosition(row, col);
  return layerData.keys[posKey] || null;
}

/**
 * Determine which layer should be active based on context
 */
export function determineActiveLayer(
  keymap: Keymap,
  context: ActiveContext,
): number {
  // If auto-switching is disabled, use current layer
  if (!keymap.settings?.autoSwitchLayers) {
    return context.currentLayer;
  }

  // Check if any layer matches the active app
  if (context.activeApp) {
    for (const [layerNum, layer] of Object.entries(keymap.layers)) {
      if (layer.triggerApp === context.activeApp) {
        return Number(layerNum);
      }
    }
  }

  // Fall back to default layer or current layer
  return keymap.settings?.defaultLayer ?? context.currentLayer;
}

/**
 * Get all layer names for UI display
 */
export function getLayerNames(keymap: Keymap): Record<number, string> {
  const names: Record<number, string> = {};
  for (const [num, layer] of Object.entries(keymap.layers)) {
    names[Number(num)] = layer.name;
  }
  return names;
}

/**
 * Check if a keymap is valid for Macro Eleven device
 */
export function isValidForDevice(keymap: Keymap): boolean {
  // Must have at least one layer
  if (Object.keys(keymap.layers).length === 0) {
    return false;
  }

  // If device is specified, check compatibility
  if (keymap.device) {
    const { matrix } = keymap.device;
    if (matrix && (matrix.rows !== 3 || matrix.cols !== 4)) {
      return false;
    }
  }

  // Check all matrix positions are valid for 3x4 matrix
  for (const layer of Object.values(keymap.layers)) {
    for (const posKey of Object.keys(layer.keys)) {
      const { row, col } = parseMatrixPosition(posKey as MatrixPositionKey);
      if (row < 0 || row >= 3 || col < 0 || col >= 4) {
        return false;
      }
    }
  }

  return true;
}
