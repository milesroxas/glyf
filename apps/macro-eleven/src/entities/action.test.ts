import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import { describe, expect, it } from "vitest";
import {
  actionKind,
  actionLabel,
  actionResultMessage,
  carryOver,
  spokenKey,
} from "./action";

const keymap = MACRO_ELEVEN_DEFAULT_KEYMAP;
const at = { row: 0, col: 1 };

describe("spokenKey", () => {
  it("names the position, label, and what the key does", () => {
    expect(
      spokenKey(
        at,
        { action: "shortcut", keys: ["cmd", "t"], label: "New Tab" },
        keymap,
      ),
    ).toBe("Row 1, column 2: New Tab, shortcut Command T");
    expect(spokenKey(at, { action: "switch_layer", layer: 2 }, keymap)).toBe(
      "Row 1, column 2: Figma Shortcuts, switches to Figma Shortcuts",
    );
    expect(spokenKey(at, undefined, keymap)).toBe("Row 1, column 2: empty");
  });
});

describe("labels and kinds", () => {
  it("falls back to what the key does", () => {
    expect(actionLabel({ action: "launch_app", app: "Notes" }, keymap)).toBe(
      "Notes",
    );
    expect(
      actionLabel({ action: "shortcut", keys: ["shift", "cmd", "p"] }, keymap),
    ).toBe("⇧⌘P");
    expect(actionLabel({ action: "cycle_layer", label: "Next" }, keymap)).toBe(
      "Next",
    );
  });

  it("maps actions to the inspector's kinds", () => {
    expect(actionKind(undefined)).toBe("none");
    expect(actionKind({ action: "noop" })).toBe("none");
    expect(actionKind({ action: "cycle_layer" })).toBe("layer");
    expect(actionKind({ action: "plugin", pluginId: "p", actionId: "a" })).toBe(
      "plugin",
    );
  });

  it("reports results in plain words", () => {
    expect(
      actionResultMessage({ action: "shortcut", keys: ["cmd", "t"] }, keymap),
    ).toBe("Sent ⌘T");
    expect(
      actionResultMessage({ action: "switch_layer", layer: 1 }, keymap),
    ).toBe("Switched to Chrome Shortcuts");
  });

  it("carries the shared fields over to a new action", () => {
    expect(
      carryOver(
        { action: "macro", sequence: [] },
        { action: "shortcut", keys: ["cmd", "t"], label: "Tab", icon: "plus" },
      ),
    ).toEqual({ action: "macro", sequence: [], label: "Tab", icon: "plus" });
  });
});
