import { describe, expect, it } from "vitest";
import {
  KeymapValidationError,
  formatMatrixPosition,
  isValidAction,
  isValidMatrixPosition,
  parseMatrixPosition,
  validateKeymap,
} from "./validation";
import type { Keymap } from "./types";

const minimalValidKeymap = (): Keymap => ({
  version: "1",
  name: "test",
  layers: {
    0: {
      name: "base",
      keys: {
        "0,0": { action: "noop" },
      },
    },
  },
});

describe("keymap validation", () => {
  it("accepts a minimal valid keymap", () => {
    expect(validateKeymap(minimalValidKeymap())).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(() => validateKeymap(null)).toThrow(KeymapValidationError);
    expect(() => validateKeymap(undefined)).toThrow(KeymapValidationError);
  });

  it("validates matrix position format", () => {
    expect(isValidMatrixPosition("1,2")).toBe(true);
    expect(isValidMatrixPosition("bad")).toBe(false);
  });

  it("parses and formats matrix positions", () => {
    expect(parseMatrixPosition("2,3")).toEqual({ row: 2, col: 3 });
    expect(formatMatrixPosition(4, 5)).toBe("4,5");
  });

  it("validates known action shapes", () => {
    expect(isValidAction({ action: "noop" })).toBe(true);
    expect(isValidAction({ action: "switch_layer", layer: 1 })).toBe(true);
    expect(isValidAction({ action: "launch_app", app: "Notes" })).toBe(true);
    expect(isValidAction({ action: "shortcut", keys: ["a"] })).toBe(true);
    expect(isValidAction({ action: "macro", sequence: [] })).toBe(true);
    expect(
      isValidAction({
        action: "plugin",
        pluginId: "p",
        actionId: "a",
      })
    ).toBe(true);
    expect(isValidAction({ action: "unknown" })).toBe(false);
  });
});
