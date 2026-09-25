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

function macroStepProblem(step: unknown): string | null {
  if (!isObject(step)) return "is not an object";
  switch (step.type) {
    case "keydown":
    case "keyup":
    case "keypress":
      return isString(step.key) && isKnownToken(step.key)
        ? null
        : `has an unknown key "${String(step.key)}"`;
    case "shortcut":
      return isStringArray(step.keys) && isValidShortcutKeys(step.keys)
        ? null
        : "has an invalid shortcut";
    case "text":
      return isString(step.text) ? null : "needs text";
    case "wait":
      return typeof step.ms === "number" &&
        Number.isInteger(step.ms) &&
        step.ms >= 0 &&
        step.ms <= MAX_WAIT_MS
        ? null
        : `must wait 0-${MAX_WAIT_MS} ms`;
    default:
      return `has an unknown type "${String(step.type)}"`;
  }
}

function actionProblem(action: unknown, layers: Set<number>): string | null {
  if (!isObject(action)) return "is not an object";
  if (action.label !== undefined && !isString(action.label)) {
    return "has a label that is not text";
  }
  switch (action.action) {
    case "switch_layer":
      if (!isLayerId(action.layer)) return "switches to an invalid layer";
      return layers.has(action.layer)
        ? null
        : `switches to layer ${action.layer}, which does not exist`;
    case "launch_app":
      if (!isNonEmptyString(action.app)) return "needs an app name";
      return action.bundleId === undefined || isNonEmptyString(action.bundleId)
        ? null
        : "has an empty bundle ID";
    case "shortcut":
      return isStringArray(action.keys) && isValidShortcutKeys(action.keys)
        ? null
        : `has an invalid shortcut "${String(action.keys)}"`;
    case "macro": {
      if (!Array.isArray(action.sequence)) return "needs a step list";
      for (const [index, step] of action.sequence.entries()) {
        const problem = macroStepProblem(step);
        if (problem) return `step ${index + 1} ${problem}`;
      }
      return null;
    }
    case "plugin":
      return isNonEmptyString(action.pluginId) &&
        isNonEmptyString(action.actionId)
        ? null
        : "needs a plugin and action ID";
    case "cycle_layer":
    case "noop":
      return null;
    default:
      return `has an unknown action "${String(action.action)}"`;
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
  const fail = (message: string): never => {
    throw new KeymapValidationError(message);
  };

  if (!isObject(keymap)) fail("Keymap must be an object");
  const km = keymap as Json;
  if (!isNonEmptyString(km.version)) fail("Keymap needs a version");
  if (!isNonEmptyString(km.name)) fail("Keymap needs a name");
  if (!isObject(km.layers)) fail("Keymap needs layers");

  const entries = Object.entries(km.layers as Json);
  const ids = new Set<number>();
  for (const [id] of entries) {
    const layer = Number(id);
    if (!/^\d+$/.test(id) || !isLayerId(layer)) {
      fail(`Layer ID "${id}" must be a whole number from 0 to ${MAX_LAYER_ID}`);
    }
    ids.add(layer);
  }
  if (!ids.has(0)) fail("Keymap needs layer 0");

  for (const [id, layer] of entries) {
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

  if (km.settings !== undefined) {
    if (!isObject(km.settings)) fail("Settings must be an object");
    const { defaultLayer } = km.settings as Json;
    if (defaultLayer !== undefined && !ids.has(defaultLayer as number)) {
      fail(`Default layer ${String(defaultLayer)} does not exist`);
    }
  }
}
