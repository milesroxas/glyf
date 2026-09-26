import { isModifierToken } from "@glyf/keymap-schema";

const TYPING_MODIFIERS = new Set(["cmd", "option", "ctrl"]);
const FUNCTION_KEY = /^f([1-9]|1[0-2])$/i;

/**
 * Why a chord can't show and hide the overlay from any app, or null if it
 * can. A system-wide shortcut needs ⌘, ⌥, or ⌃ (function keys excepted), or
 * it would take over ordinary typing. The host checks the same rule.
 */
export function shortcutProblem(keys: readonly string[]): string | null {
  const key = keys.find((token) => !isModifierToken(token));
  if (!key) return "Add a key to the modifiers.";
  if (FUNCTION_KEY.test(key)) return null;
  return keys.some((token) => TYPING_MODIFIERS.has(token))
    ? null
    : "Include ⌘, ⌥, or ⌃, so the shortcut doesn’t take over typing.";
}
