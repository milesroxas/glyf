/**
 * Pure, immutable keymap edits. Every function returns a new `Keymap` and
 * leaves its input untouched, so callers can keep old values for undo.
 */
import { isSameShortcut } from "./shortcut";
import type { Action, Keymap, Layer, MatrixPositionKey } from "./types";

/** A key on a specific layer. */
export interface KeyRef {
  layer: number;
  pos: MatrixPositionKey;
}

const MAX_LAYER_ID = 255;

/** Layer IDs in ascending order. */
export function layerIds(keymap: Keymap): number[] {
  return Object.keys(keymap.layers)
    .map(Number)
    .sort((a, b) => a - b);
}

export function getAction(
  keymap: Keymap,
  layer: number,
  pos: MatrixPositionKey,
): Action | undefined {
  return keymap.layers[layer]?.keys[pos];
}

function requireLayer(keymap: Keymap, layer: number): Layer {
  const found = keymap.layers[layer];
  if (!found) throw new Error(`Layer ${layer} does not exist`);
  return found;
}

function withLayer(
  keymap: Keymap,
  layer: number,
  update: (current: Layer) => Layer,
): Keymap {
  return {
    ...keymap,
    layers: { ...keymap.layers, [layer]: update(requireLayer(keymap, layer)) },
  };
}

function withKeys(
  keymap: Keymap,
  layer: number,
  update: (keys: Layer["keys"]) => Layer["keys"],
): Keymap {
  return withLayer(keymap, layer, (current) => ({
    ...current,
    keys: update({ ...current.keys }),
  }));
}

/** Apply `update` to every action; return the same action to keep it, null to clear the key. */
function mapActions(
  keymap: Keymap,
  update: (action: Action, ref: KeyRef) => Action | null,
): Keymap {
  const layers: Keymap["layers"] = {};
  for (const id of layerIds(keymap)) {
    const layer = keymap.layers[id];
    const keys: Layer["keys"] = {};
    for (const [pos, action] of Object.entries(layer.keys) as [
      MatrixPositionKey,
      Action,
    ][]) {
      const next = update(action, { layer: id, pos });
      if (next) keys[pos] = next;
    }
    layers[id] = { ...layer, keys };
  }
  return { ...keymap, layers };
}

export function setKeyAction(
  keymap: Keymap,
  layer: number,
  pos: MatrixPositionKey,
  action: Action,
): Keymap {
  return withKeys(keymap, layer, (keys) => ({ ...keys, [pos]: action }));
}

export function clearKey(
  keymap: Keymap,
  layer: number,
  pos: MatrixPositionKey,
): Keymap {
  return withKeys(keymap, layer, (keys) => {
    delete keys[pos];
    return keys;
  });
}

/** Set a key's label. An empty label removes it. No-op on an empty key. */
export function setLabel(
  keymap: Keymap,
  layer: number,
  pos: MatrixPositionKey,
  label: string,
): Keymap {
  const action = getAction(keymap, layer, pos);
  if (!action) return keymap;
  const { label: _previous, ...rest } = action;
  return setKeyAction(
    keymap,
    layer,
    pos,
    label ? { ...rest, label } : (rest as Action),
  );
}

function nextLayerId(keymap: Keymap): number {
  const next = Math.max(...layerIds(keymap)) + 1;
  if (next > MAX_LAYER_ID) {
    throw new Error(`A keymap holds at most ${MAX_LAYER_ID + 1} layers`);
  }
  return next;
}

export function addLayer(
  keymap: Keymap,
  name: string,
): { keymap: Keymap; layer: number } {
  const layer = nextLayerId(keymap);
  return {
    keymap: {
      ...keymap,
      layers: { ...keymap.layers, [layer]: { name, keys: {} } },
    },
    layer,
  };
}

export function renameLayer(
  keymap: Keymap,
  layer: number,
  name: string,
): Keymap {
  return withLayer(keymap, layer, (current) => ({ ...current, name }));
}

/**
 * Copy a layer to a new ID. The copy has no trigger app, since two layers
 * with the same trigger would compete for the same app.
 */
export function duplicateLayer(
  keymap: Keymap,
  layer: number,
  name: string,
): { keymap: Keymap; layer: number } {
  const { triggerApp: _trigger, ...source } = requireLayer(keymap, layer);
  const copy = nextLayerId(keymap);
  return {
    keymap: {
      ...keymap,
      layers: {
        ...keymap.layers,
        [copy]: { ...source, name, keys: { ...source.keys } },
      },
    },
    layer: copy,
  };
}

/**
 * Delete a layer. Keys that switched to it are cleared and returned so the
 * caller can say how many changed. Layer 0 cannot be deleted.
 */
export function deleteLayer(
  keymap: Keymap,
  layer: number,
): { keymap: Keymap; cleared: KeyRef[] } {
  if (layer === 0) throw new Error("Layer 0 cannot be deleted");
  requireLayer(keymap, layer);

  const { [layer]: _removed, ...layers } = keymap.layers;
  const cleared: KeyRef[] = [];
  let next = mapActions({ ...keymap, layers }, (action, ref) => {
    if (action.action === "switch_layer" && action.layer === layer) {
      cleared.push(ref);
      return null;
    }
    return action;
  });

  if (next.settings?.defaultLayer === layer) {
    const { defaultLayer: _default, ...settings } = next.settings;
    next = { ...next, settings };
  }
  return { keymap: next, cleared };
}

export function setLayerTrigger(
  keymap: Keymap,
  layer: number,
  triggerApp: string | undefined,
): Keymap {
  return withLayer(keymap, layer, ({ triggerApp: _previous, ...current }) =>
    triggerApp ? { ...current, triggerApp } : current,
  );
}

/**
 * Move a layer to `index` among the layers after layer 0. Layer IDs are
 * reassigned in the new order, and every `switch_layer` target and the
 * default layer follow their layer.
 */
export function moveLayer(
  keymap: Keymap,
  layer: number,
  index: number,
): Keymap {
  if (layer === 0) throw new Error("Layer 0 cannot be moved");
  requireLayer(keymap, layer);

  const slots = layerIds(keymap).filter((id) => id !== 0);
  const order = slots.filter((id) => id !== layer);
  order.splice(Math.max(0, Math.min(index, order.length)), 0, layer);

  const renumber = new Map(order.map((id, i) => [id, slots[i]]));
  const target = (id: number) => renumber.get(id) ?? id;

  const layers: Keymap["layers"] = { 0: keymap.layers[0] };
  for (const id of order) layers[target(id)] = keymap.layers[id];

  let next = mapActions({ ...keymap, layers }, (action) =>
    action.action === "switch_layer"
      ? { ...action, layer: target(action.layer) }
      : action,
  );
  const defaultLayer = next.settings?.defaultLayer;
  if (defaultLayer !== undefined) {
    next = {
      ...next,
      settings: { ...next.settings, defaultLayer: target(defaultLayer) },
    };
  }
  return next;
}

export function setAutoSwitchLayers(keymap: Keymap, enabled: boolean): Keymap {
  return {
    ...keymap,
    settings: { ...keymap.settings, autoSwitchLayers: enabled },
  };
}

/** Follow the front app unless the keymap turns it off (the host's default). */
export function autoSwitchLayers(keymap: Keymap): boolean {
  return keymap.settings?.autoSwitchLayers ?? true;
}

/** Another key on the same layer that sends the same shortcut, if any. */
export function findShortcutConflict(
  keymap: Keymap,
  { layer, pos }: KeyRef,
  keys: readonly string[],
): MatrixPositionKey | null {
  const entries = Object.entries(keymap.layers[layer]?.keys ?? {}) as [
    MatrixPositionKey,
    Action,
  ][];
  for (const [other, action] of entries) {
    if (
      other !== pos &&
      action.action === "shortcut" &&
      isSameShortcut(action.keys, keys)
    ) {
      return other;
    }
  }
  return null;
}
