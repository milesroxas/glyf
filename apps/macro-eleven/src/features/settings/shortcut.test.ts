import { describe, expect, it } from "vitest";
import { shortcutProblem } from "./shortcut";

describe("shortcutProblem", () => {
  it("accepts a key with ⌘, ⌥, or ⌃", () => {
    expect(shortcutProblem(["option", "cmd", "o"])).toBeNull();
    expect(shortcutProblem(["ctrl", "shift", "space"])).toBeNull();
  });

  it("accepts a function key alone", () => {
    expect(shortcutProblem(["f6"])).toBeNull();
  });

  it("refuses chords that would take over typing", () => {
    expect(shortcutProblem(["o"])).toMatch(/Include ⌘, ⌥, or ⌃/);
    expect(shortcutProblem(["shift", "o"])).toMatch(/Include ⌘, ⌥, or ⌃/);
  });

  it("refuses modifiers with no key", () => {
    expect(shortcutProblem(["cmd", "shift"])).toMatch(/Add a key/);
  });
});
