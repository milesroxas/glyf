import { describe, expect, it } from "vitest";
import {
  chordsToKeys,
  codeToToken,
  describeShortcut,
  formatShortcut,
  isSameShortcut,
  isValidShortcutKeys,
  KEY_TOKENS,
  MODIFIER_TOKENS,
  parseShortcut,
} from "./shortcut";

describe("formatShortcut", () => {
  it("renders modifiers as glyphs in macOS menu order (⌃⌥⇧⌘)", () => {
    expect(formatShortcut(["cmd", "shift", "t"])).toEqual(["⇧⌘T"]);
    expect(formatShortcut(["shift", "ctrl", "option", "cmd", "a"])).toEqual([
      "⌃⌥⇧⌘A",
    ]);
  });

  it("renders one group per chord", () => {
    expect(formatShortcut(["cmd", "k", "cmd", "s"])).toEqual(["⌘K", "⌘S"]);
  });

  it("uses glyphs for special keys and accepts aliases", () => {
    expect(formatShortcut(["command", "return"])).toEqual(["⌘↩"]);
    expect(formatShortcut(["alt", "backspace"])).toEqual(["⌥⌫"]);
    expect(formatShortcut(["f12"])).toEqual(["F12"]);
  });

  it("keeps unknown tokens readable", () => {
    expect(formatShortcut(["fn", "f"])).toEqual(["fn", "F"]);
  });
});

describe("describeShortcut", () => {
  it("spells out every chord", () => {
    expect(describeShortcut(["cmd", "k", "cmd", "s"])).toBe(
      "Command K, then Command S",
    );
  });
});

describe("parseShortcut", () => {
  it("groups modifiers with the key that follows them", () => {
    expect(parseShortcut(["cmd", "k", "shift", "cmd", "s"])).toEqual([
      { modifiers: ["cmd"], key: "k" },
      { modifiers: ["shift", "cmd"], key: "s" },
    ]);
  });

  it("canonicalizes aliases", () => {
    expect(parseShortcut(["Command", "Opt", "PgUp"])).toEqual([
      { modifiers: ["option", "cmd"], key: "pageup" },
    ]);
  });

  it("rejects what the host rejects", () => {
    expect(isValidShortcutKeys([])).toBe(false);
    expect(isValidShortcutKeys(["cmd"])).toBe(false);
    expect(isValidShortcutKeys(["cmd", "k", "cmd"])).toBe(false);
    expect(isValidShortcutKeys(["fn", "f"])).toBe(false);
    expect(isValidShortcutKeys(["cmd", "f13"])).toBe(false);
  });

  it("round-trips through chordsToKeys", () => {
    const chords = parseShortcut(["shift", "cmd", "p"]);
    expect(chords && chordsToKeys(chords)).toEqual(["shift", "cmd", "p"]);
  });
});

describe("isSameShortcut", () => {
  it("ignores modifier order and aliases", () => {
    expect(
      isSameShortcut(["shift", "cmd", "t"], ["command", "shift", "t"]),
    ).toBe(true);
    expect(isSameShortcut(["cmd", "t"], ["cmd", "shift", "t"])).toBe(false);
  });
});

describe("codeToToken", () => {
  it.each([
    ["KeyA", "a"],
    ["Digit7", "7"],
    ["Minus", "-"],
    ["Backquote", "`"],
    ["BracketLeft", "["],
    ["ArrowUp", "up"],
    ["F5", "f5"],
    ["NumpadEnter", "enter"],
    ["MetaLeft", "cmd"],
    ["AltRight", "option"],
  ])("maps %s to %s", (code, token) => {
    expect(codeToToken(code)).toBe(token);
  });

  it("returns null for keys outside the table", () => {
    expect(codeToToken("Fn")).toBeNull();
    expect(codeToToken("F13")).toBeNull();
  });
});

describe("token table", () => {
  it("has no duplicate tokens, aliases, or codes", () => {
    const entries = [...MODIFIER_TOKENS, ...KEY_TOKENS];
    const names = entries.flatMap((entry) => [entry.token, ...entry.aliases]);
    const codes = entries.flatMap((entry) => entry.codes);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
