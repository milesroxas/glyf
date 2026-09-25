/**
 * Keymap validation. The host runs the same checks before it saves or imports
 * a keymap (`Keymap::validate` in the Rust app); `fixtures/` holds the cases
 * both test suites run.
 */
import { isDeviceKey, MACRO_ELEVEN } from "./device";
import { isValidMatrixPosition, parseMatrixPosition } from "./position";
import { isKnownToken, isValidShortcutKeys } from "./shortcut";
import type { DeviceDescriptor, Keymap } from "./types";

export class KeymapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeymapValidationError";
  }
}

const MAX_LAYER_ID = 255;
/** Longest single wait a macro may hold the action queue. */
const MAX_WAIT_MS = 10_000;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isLayerId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_LAYER_ID
  );
}

/** A problem found by a check, or null when the value is fine. */
type Problem = string | null;

function keyStepProblem(step: Json): Problem {
  return isString(step.key) && isKnownToken(step.key)
    ? null
    : `has an unknown key "${String(step.key)}"`;
}

function shortcutProblem(keys: unknown): Problem {
  return isStringArray(keys) && isValidShortcutKeys(keys)
    ? null
    : `has an invalid shortcut "${String(keys)}"`;
}

const MACRO_STEP_CHECKS = new Map<string, (step: Json) => Problem>([
  ["keydown", keyStepProblem],
  ["keyup", keyStepProblem],
  ["keypress", keyStepProblem],
  ["shortcut", (step) => shortcutProblem(step.keys)],
  ["text", (step) => (isString(step.text) ? null : "needs text")],
  [
    "wait",
    ({ ms }) =>
      typeof ms === "number" &&
      Number.isInteger(ms) &&
      ms >= 0 &&
      ms <= MAX_WAIT_MS
        ? null
        : `must wait 0-${MAX_WAIT_MS} ms`,
  ],
]);

function macroStepProblem(step: unknown): Problem {
  if (!isObject(step)) return "is not an object";
  const check = MACRO_STEP_CHECKS.get(String(step.type));
  return check ? check(step) : `has an unknown type "${String(step.type)}"`;
}

const ACTION_CHECKS = new Map<
  string,
  (action: Json, layers: Set<number>) => Problem
>([
  [
    "switch_layer",
    ({ layer }, layers) => {
      if (!isLayerId(layer)) return "switches to an invalid layer";
      return layers.has(layer)
        ? null
        : `switches to layer ${layer}, which does not exist`;
    },
  ],
  [
    "launch_app",
    ({ app, bundleId }) => {
      if (!isNonEmptyString(app)) return "needs an app name";
      return bundleId === undefined || isNonEmptyString(bundleId)
        ? null
        : "has an empty bundle ID";
    },
  ],
  ["shortcut", ({ keys }) => shortcutProblem(keys)],
  [
    "macro",
    ({ sequence }) => {
      if (!Array.isArray(sequence)) return "needs a step list";
      for (const [index, step] of sequence.entries()) {
        const problem = macroStepProblem(step);
        if (problem) return `step ${index + 1} ${problem}`;
      }
      return null;
    },
  ],
  [
    "plugin",
    ({ pluginId, actionId }) =>
      isNonEmptyString(pluginId) && isNonEmptyString(actionId)
        ? null
        : "needs a plugin and action ID",
  ],
  ["cycle_layer", () => null],
  ["noop", () => null],
]);

function actionProblem(action: unknown, layers: Set<number>): Problem {
  if (!isObject(action)) return "is not an object";
  if (action.label !== undefined && !isString(action.label)) {
    return "has a label that is not text";
  }
  const check = ACTION_CHECKS.get(String(action.action));
  return check
    ? check(action, layers)
    : `has an unknown action "${String(action.action)}"`;
}

function fail(message: string): never {
  throw new KeymapValidationError(message);
}

/** Layer IDs, checked: whole numbers 0-255, including 0. */
function layerIdSet(layers: Json): Set<number> {
  const ids = new Set<number>();
  for (const id of Object.keys(layers)) {
    const layer = Number(id);
    if (!/^\d+$/.test(id) || !isLayerId(layer)) {
      fail(`Layer ID "${id}" must be a whole number from 0 to ${MAX_LAYER_ID}`);
    }
    ids.add(layer);
  }
  if (!ids.has(0)) fail("Keymap needs layer 0");
  return ids;
}

function assertLayer(
  id: string,
  layer: unknown,
  ids: Set<number>,
  device: DeviceDescriptor,
): void {
  if (!isObject(layer)) fail(`Layer ${id} must be an object`);
  const { name, keys, triggerApp } = layer as Json;
  if (!isString(name)) fail(`Layer ${id} needs a name`);
  if (triggerApp !== undefined && !isNonEmptyString(triggerApp)) {
    fail(`Layer ${id} has an empty trigger app`);
  }
  if (!isObject(keys)) fail(`Layer ${id} needs keys`);

  for (const [pos, action] of Object.entries(keys as Json)) {
    if (
      !isValidMatrixPosition(pos) ||
      !isDeviceKey(device, parseMatrixPosition(pos))
    ) {
      fail(
        `Layer ${id} has a key at ${pos}, which ${device.name} does not have`,
      );
    }
    const problem = actionProblem(action, ids);
    if (problem) fail(`Key ${pos} on layer ${id} ${problem}`);
  }
}

/**
 * Throw a `KeymapValidationError` describing the first problem, or narrow
 * `keymap` to `Keymap`.
 */
export function assertKeymap(
  keymap: unknown,
  device: DeviceDescriptor = MACRO_ELEVEN,
): asserts keymap is Keymap {
  if (!isObject(keymap)) fail("Keymap must be an object");
  const km = keymap as Json;
  if (!isNonEmptyString(km.version)) fail("Keymap needs a version");
  if (!isNonEmptyString(km.name)) fail("Keymap needs a name");
  if (!isObject(km.layers)) fail("Keymap needs layers");

  const layers = km.layers as Json;
  const ids = layerIdSet(layers);
  for (const [id, layer] of Object.entries(layers)) {
    assertLayer(id, layer, ids, device);
  }

  if (km.settings !== undefined) {
    if (!isObject(km.settings)) fail("Settings must be an object");
    const { defaultLayer } = km.settings as Json;
    if (defaultLayer !== undefined && !ids.has(defaultLayer as number)) {
      fail(`Default layer ${String(defaultLayer)} does not exist`);
    }
  }
}
