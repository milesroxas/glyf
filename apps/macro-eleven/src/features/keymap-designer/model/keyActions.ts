/**
 * Actions the designer creates, from what the user picked.
 */
import {
  findShortcutConflict,
  getAction,
  type KeyRef,
  layerIds,
} from "@glyf/keymap-schema";
import { carryOver } from "../../../entities/action";
import type { InstalledApp } from "../../../entities/app";
import {
  type Action,
  type Keymap,
  keyNumber,
  type LaunchAppAction,
} from "../../../entities/keymap";

/**
 * A key that opens `app`. A label that named the key's previous app is
 * dropped, since it described that app; other labels are kept.
 */
export function launchAction(
  app: InstalledApp,
  previous: Action | undefined,
): LaunchAppAction {
  const next: LaunchAppAction = {
    action: "launch_app",
    app: app.name,
    bundleId: app.bundleId,
  };
  if (previous?.action !== "launch_app") return carryOver(next, previous);
  const { label: _appLabel, ...rest } = carryOver(next, previous);
  return previous.focusIfRunning === false
    ? { ...rest, focusIfRunning: false }
    : rest;
}

/** A new layer key goes to the first other layer, or cycles when there is none. */
export function defaultLayerAction(keymap: Keymap, current: number): Action {
  const other = layerIds(keymap).find((id) => id !== current);
  return other === undefined
    ? { action: "cycle_layer" }
    : { action: "switch_layer", layer: other };
}

/** "Key 2 (New Tab)" when another key on the layer sends `keys`, else null. */
export function shortcutConflict(
  keymap: Keymap,
  ref: KeyRef,
  keys: readonly string[],
): string | null {
  const other = findShortcutConflict(keymap, ref, keys);
  if (!other) return null;
  const label = getAction(keymap, ref.layer, other)?.label;
  return `Key ${keyNumber(other)}${label ? ` (${label})` : ""}`;
}
