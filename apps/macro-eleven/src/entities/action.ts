/**
 * Action entity: what a key does, in the words the designer uses.
 */
import {
  type Action,
  describeShortcut,
  formatShortcut,
  type Keymap,
  type MatrixPosition,
} from "@glyf/keymap-schema";
import { layerName } from "./keymap";

/** Longest tile label; also the rev 2 screen's tile limit. */
export const LABEL_MAX_LENGTH = 16;

/** The designer's action kinds (the inspector's segmented control). */
export type ActionKind = "app" | "shortcut" | "layer" | "macro" | "none";

export const ACTION_KINDS: readonly { kind: ActionKind; label: string }[] = [
  { kind: "app", label: "App" },
  { kind: "shortcut", label: "Shortcut" },
  { kind: "layer", label: "Layer" },
  { kind: "macro", label: "Macro" },
  { kind: "none", label: "None" },
];

/** Plugins cannot be edited yet; they show as read-only. */
export function actionKind(action: Action | undefined): ActionKind | "plugin" {
  switch (action?.action) {
    case "launch_app":
      return "app";
    case "shortcut":
      return "shortcut";
    case "switch_layer":
    case "cycle_layer":
      return "layer";
    case "macro":
      return "macro";
    case "plugin":
      return "plugin";
    default:
      return "none";
  }
}

/** Text a key shows when it has no label of its own. */
export function describeAction(action: Action, keymap?: Keymap): string {
  switch (action.action) {
    case "launch_app":
      return action.app;
    case "shortcut":
      return formatShortcut(action.keys).join(" ");
    case "switch_layer":
      return layerName(keymap, action.layer);
    case "cycle_layer":
      return "Next Layer";
    case "macro":
      return "Macro";
    case "plugin":
      return "Plugin";
    case "noop":
      return "";
  }
}

export function actionLabel(action: Action, keymap: Keymap): string {
  return action.label || describeAction(action, keymap);
}

export interface ActionExecutedEvent {
  position: MatrixPosition;
  layer: number;
  action: Action;
}

export interface ActionErrorEvent {
  position: MatrixPosition;
  layer: number;
  error: string;
}

/** What happened, for a completion toast: "Sent ⇧⌘T", "Opened Figma". */
export function actionResultMessage(action: Action, keymap: Keymap): string {
  switch (action.action) {
    case "launch_app":
      return `Opened ${action.app}`;
    case "shortcut":
      return `Sent ${formatShortcut(action.keys).join(" ")}`;
    case "switch_layer":
      return `Switched to ${layerName(keymap, action.layer)}`;
    case "cycle_layer":
      return "Switched to the next layer";
    case "macro":
      return `Ran ${action.label || "macro"}`;
    default:
      return actionLabel(action, keymap) || "Done";
  }
}

/**
 * `next` with the fields every action shares (label, icon, description)
 * carried over from `previous`, so changing what a key does keeps its name.
 */
export function carryOver<T extends Action>(
  next: T,
  previous: Action | undefined,
): T {
  if (!previous) return next;
  const { label, icon, description } = previous;
  return {
    ...(label && { label }),
    ...(icon && { icon }),
    ...(description && { description }),
    ...next,
  };
}

/** What an action does, spoken: "opens Google Chrome", "shortcut Command T". */
function spokenAction(action: Action, keymap: Keymap): string {
  switch (action.action) {
    case "launch_app":
      return `opens ${action.app}`;
    case "shortcut":
      return `shortcut ${describeShortcut(action.keys)}`;
    case "switch_layer":
      return `switches to ${layerName(keymap, action.layer)}`;
    case "cycle_layer":
      return "next layer";
    case "macro":
      return `macro with ${action.sequence.length} steps`;
    default:
      return "";
  }
}

/**
 * How a screen reader hears a key: "Row 1, column 2: New Tab, shortcut
 * Command T".
 */
export function spokenKey(
  { row, col }: MatrixPosition,
  action: Action | undefined,
  keymap: Keymap,
): string {
  const where = `Row ${row + 1}, column ${col + 1}`;
  if (!action) return `${where}: empty`;
  const does = spokenAction(action, keymap);
  const label = actionLabel(action, keymap);
  return `${where}: ${[label, does].filter(Boolean).join(", ")}`;
}
