import type { Keymap, MatrixPositionKey, Action } from './types';

/**
 * Validation utilities for keymap schema
 */

export class KeymapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeymapValidationError';
  }
}

/**
 * Validate a keymap object
 */
export function validateKeymap(keymap: unknown): keymap is Keymap {
  if (typeof keymap !== 'object' || keymap === null) {
    throw new KeymapValidationError('Keymap must be an object');
  }

  const km = keymap as Partial<Keymap>;

  // Required fields
  if (!km.version || typeof km.version !== 'string') {
    throw new KeymapValidationError('Keymap must have a version string');
  }

  if (!km.name || typeof km.name !== 'string') {
    throw new KeymapValidationError('Keymap must have a name');
  }

  if (!km.layers || typeof km.layers !== 'object') {
    throw new KeymapValidationError('Keymap must have layers object');
  }

  // Validate layers
  for (const [layerNum, layer] of Object.entries(km.layers)) {
    if (isNaN(Number(layerNum))) {
      throw new KeymapValidationError(`Layer key must be a number: ${layerNum}`);
    }

    if (!layer.name || typeof layer.name !== 'string') {
      throw new KeymapValidationError(`Layer ${layerNum} must have a name`);
    }

    if (!layer.keys || typeof layer.keys !== 'object') {
      throw new KeymapValidationError(`Layer ${layerNum} must have keys object`);
    }

    // Validate matrix positions
    for (const [pos, action] of Object.entries(layer.keys)) {
      if (!isValidMatrixPosition(pos)) {
        throw new KeymapValidationError(
          `Invalid matrix position: ${pos} (must be "row,col")`
        );
      }

      if (!isValidAction(action)) {
        throw new KeymapValidationError(`Invalid action at ${pos} in layer ${layerNum}`);
      }
    }
  }

  return true;
}

/**
 * Validate matrix position format
 */
export function isValidMatrixPosition(pos: string): pos is MatrixPositionKey {
  const match = pos.match(/^(\d+),(\d+)$/);
  return match !== null;
}

/**
 * Parse matrix position string to coordinates
 */
export function parseMatrixPosition(pos: MatrixPositionKey): { row: number; col: number } {
  const [row, col] = pos.split(',').map(Number);
  return { row, col };
}

/**
 * Format matrix position to string
 */
export function formatMatrixPosition(row: number, col: number): MatrixPositionKey {
  return `${row},${col}`;
}

/**
 * Basic action validation
 */
export function isValidAction(action: unknown): action is Action {
  if (typeof action !== 'object' || action === null) {
    return false;
  }

  const act = action as Partial<Action>;

  if (!act.action || typeof act.action !== 'string') {
    return false;
  }

  // Type-specific validation
  switch (act.action) {
    case 'launch_app':
      return typeof (act as any).app === 'string';

    case 'shortcut':
      return Array.isArray((act as any).keys);

    case 'macro':
      return Array.isArray((act as any).sequence);

    case 'plugin':
      return typeof (act as any).pluginId === 'string' &&
             typeof (act as any).actionId === 'string';

    case 'switch_layer':
      return typeof (act as any).layer === 'number';

    case 'cycle_layer':
    case 'noop':
      return true;

    default:
      return false;
  }
}
