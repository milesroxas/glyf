/**
 * Keymap entity: the shared schema plus the app's profile and engine types.
 */
import {
  type Keymap,
  type MatrixPositionKey,
  parseMatrixPosition,
} from "@glyf/keymap-schema";
import { matrixToIndex } from "../shared/config/layout";

export type {
  Action,
  Keymap,
  LaunchAppAction,
  MacroAction,
  MacroStep,
  MatrixPosition,
  MatrixPositionKey,
  ShortcutAction,
} from "@glyf/keymap-schema";

/** The bundled keymap's profile. Read-only; duplicate it to edit. */
export const DEFAULT_PROFILE = "Default";

export interface ProfileSummary {
  name: string;
  readOnly: boolean;
  /** Last save, ms since the epoch. Null for Default. */
  updatedAt: number | null;
}

export interface ProfileList {
  active: string;
  profiles: ProfileSummary[];
}

export interface KeymapChangedEvent {
  profile: string;
  /** Window that made the change; that window already has it. */
  source: string | null;
}

/** Engine state for windows that open after it changed. */
export interface EngineSnapshot {
  layer: number;
  activeProfile: string;
  hostControl: boolean;
  connected: boolean;
}

export interface LayerChangeEvent {
  layer: number;
  triggerApp?: string | null;
}

/** A layer's name; `Layer N` when it has none or the keymap is not at hand. */
export function layerName(keymap: Keymap | undefined, layer: number): string {
  return keymap?.layers[layer]?.name || `Layer ${layer}`;
}

/** A name not in `taken`: `base`, then `base 2`, `base 3`… */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** A key's number as printed in the designer: its position in the layout, from 1. */
export function keyNumber(pos: MatrixPositionKey): number {
  return matrixToIndex(parseMatrixPosition(pos)) + 1;
}
