/**
 * Shortcut tokens: parsing, validation, and macOS glyph rendering.
 *
 * `tokens.json` is the single vocabulary. The Rust host parses the same
 * tokens (`executor/runtime/shortcuts.rs`) and a Rust test asserts it accepts
 * every token and alias listed there.
 */
import tokens from "./tokens.json";
import type { KeyModifier } from "./types";

interface TokenEntry {
  /** Canonical token written to keymap files. */
  token: string;
  /** macOS glyph (⌘, ↩) or key cap text. */
  glyph: string;
  /** Spoken name for assistive technology. */
  name: string;
  /** `KeyboardEvent.code` values that produce this token. */
  codes: string[];
  /** Other spellings the host accepts. */
  aliases: string[];
}

interface ModifierEntry extends TokenEntry {
  token: KeyModifier;
}

/** Modifiers in macOS display order: ⌃ ⌥ ⇧ ⌘. */
export const MODIFIER_TOKENS: readonly ModifierEntry[] =
  tokens.modifiers as ModifierEntry[];

export const KEY_TOKENS: readonly TokenEntry[] = tokens.keys;

/** One chord: modifiers held while one key is pressed. */
export interface Chord {
  modifiers: KeyModifier[];
  key: string;
}

function index<T extends TokenEntry>(entries: readonly T[]) {
  const byName = new Map<string, T>();
  for (const entry of entries) {
    for (const name of [entry.token, ...entry.aliases]) {
      byName.set(name, entry);
    }
  }
  return byName;
}

const modifierByName = index(MODIFIER_TOKENS);
const keyByName = index(KEY_TOKENS);
const tokenByCode = new Map(
  [...MODIFIER_TOKENS, ...KEY_TOKENS].flatMap((entry) =>
    entry.codes.map((code) => [code, entry.token] as const),
  ),
);

/** Multi-character names are case-insensitive; single characters are not. */
function normalize(token: string): string {
  const trimmed = token.trim();
  return trimmed.length > 1 ? trimmed.toLowerCase() : trimmed;
}

function modifierEntry(token: string): ModifierEntry | undefined {
  return modifierByName.get(normalize(token));
}

function keyEntry(token: string): TokenEntry | undefined {
  return keyByName.get(normalize(token));
}

export function isModifierToken(token: string): boolean {
  return modifierEntry(token) !== undefined;
}

/** Any modifier or key token, including aliases. */
export function isKnownToken(token: string): boolean {
  return isModifierToken(token) || keyEntry(token) !== undefined;
}

/** Canonical token for a `KeyboardEvent.code`, or null if unsupported. */
export function codeToToken(code: string): string | null {
  return tokenByCode.get(code) ?? null;
}

interface RawChord {
  modifiers: string[];
  key: string | null;
}

/** Group tokens into chords the way the host does, without validating them. */
function groupTokens(keys: readonly string[]): RawChord[] {
  const chords: RawChord[] = [];
  let modifiers: string[] = [];
  for (const raw of keys) {
    const token = raw.trim();
    if (!token) continue;
    if (isModifierToken(token)) {
      modifiers.push(token);
      continue;
    }
    chords.push({ modifiers, key: token });
    modifiers = [];
  }
  if (modifiers.length > 0) chords.push({ modifiers, key: null });
  return chords;
}

function sortModifiers(modifiers: Iterable<KeyModifier>): KeyModifier[] {
  const held = new Set(modifiers);
  return MODIFIER_TOKENS.map((entry) => entry.token).filter((token) =>
    held.has(token),
  );
}

/**
 * Parse a token list into chords. Returns null when the host would reject it:
 * no key, a trailing modifier, or an unknown token.
 */
export function parseShortcut(keys: readonly string[]): Chord[] | null {
  const groups = groupTokens(keys);
  if (groups.length === 0) return null;
  const chords: Chord[] = [];
  for (const group of groups) {
    const key = group.key === null ? undefined : keyEntry(group.key);
    if (!key) return null;
    chords.push({
      modifiers: sortModifiers(
        group.modifiers.map(
          (token) => (modifierEntry(token) as ModifierEntry).token,
        ),
      ),
      key: key.token,
    });
  }
  return chords;
}

export function isValidShortcutKeys(keys: readonly string[]): boolean {
  return parseShortcut(keys) !== null;
}

/** Flatten chords to canonical tokens (modifiers in display order). */
export function chordsToKeys(chords: readonly Chord[]): string[] {
  return chords.flatMap((chord) => [
    ...sortModifiers(chord.modifiers),
    chord.key,
  ]);
}

/** True when both token lists send the same keystrokes. */
export function isSameShortcut(
  a: readonly string[],
  b: readonly string[],
): boolean {
  const left = parseShortcut(a);
  const right = parseShortcut(b);
  if (!left || !right) return false;
  return chordsToKeys(left).join(" ") === chordsToKeys(right).join(" ");
}

function renderChord(
  group: RawChord,
  text: (entry: TokenEntry) => string,
  separator: string,
): string {
  const held = new Set(
    group.modifiers.flatMap((token) => modifierEntry(token)?.token ?? []),
  );
  const parts = MODIFIER_TOKENS.filter((entry) => held.has(entry.token)).map(
    text,
  );
  if (group.key !== null) {
    const entry = keyEntry(group.key);
    parts.push(entry ? text(entry) : group.key);
  }
  return parts.join(separator);
}

/**
 * Render each chord as macOS glyphs, modifiers in menu order:
 * `["cmd", "shift", "t"]` → `["⇧⌘T"]`, `["cmd", "k", "cmd", "s"]` →
 * `["⌘K", "⌘S"]`. Unknown tokens render as typed so an invalid shortcut is
 * still readable next to its warning.
 */
export function formatShortcut(keys: readonly string[]): string[] {
  return groupTokens(keys).map((group) =>
    renderChord(group, (entry) => entry.glyph, ""),
  );
}

/** Spoken form, e.g. "Command K, then Command S". */
export function describeShortcut(keys: readonly string[]): string {
  return groupTokens(keys)
    .map((group) => renderChord(group, (entry) => entry.name, " "))
    .join(", then ");
}
