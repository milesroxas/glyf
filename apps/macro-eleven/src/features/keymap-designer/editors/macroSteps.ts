import type { MacroStep, MacroStepType } from "../../../entities/keymap";

export const STEP_LABELS: Record<MacroStepType, string> = {
  shortcut: "Shortcut",
  text: "Type text",
  wait: "Wait",
  keydown: "Key down",
  keyup: "Key up",
  keypress: "Press key",
};

/** The Add step menu, in order. A one-key shortcut covers a key press. */
export const NEW_STEP_TYPES = [
  "shortcut",
  "text",
  "wait",
  "keydown",
  "keyup",
] as const satisfies readonly MacroStepType[];

export type NewStepType = (typeof NEW_STEP_TYPES)[number];

/** Steps made of keys. A new one exists only once its keys are recorded. */
export type RecordedStep = Extract<
  MacroStep,
  { key: string } | { keys: string[] }
>;
export type RecordedStepType = RecordedStep["type"];

type BlankStepType = Exclude<MacroStepType, RecordedStepType>;

const BLANK_STEPS: Record<BlankStepType, () => MacroStep> = {
  text: () => ({ type: "text", text: "" }),
  wait: () => ({ type: "wait", ms: 100 }),
};

export function isRecorded(type: MacroStepType): type is RecordedStepType {
  return !(type in BLANK_STEPS);
}

export function blankStep(type: BlankStepType): MacroStep {
  return BLANK_STEPS[type]();
}

export function recordedStep(
  type: RecordedStepType,
  keys: string[],
): RecordedStep {
  return type === "shortcut" ? { type, keys } : { type, key: keys[0] };
}

export function recordedKeys(step: RecordedStep): string[] {
  return step.type === "shortcut" ? step.keys : [step.key];
}
