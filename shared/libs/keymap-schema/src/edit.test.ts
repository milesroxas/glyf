import { describe, expect, it } from "vitest";
import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "./defaults";
import {
  addLayer,
  autoSwitchLayers,
  clearKey,
  deleteLayer,
  duplicateLayer,
  findShortcutConflict,
  getAction,
  layerIds,
  moveLayer,
  renameLayer,
  setAutoSwitchLayers,
  setKeyAction,
  setLabel,
  setLayerTrigger,
} from "./edit";
import type { Keymap } from "./types";
import { assertKeymap } from "./validation";

const keymap = (): Keymap => ({
  version: "1.0.0",
  name: "Test",
  layers: {
    0: {
      name: "Base",
      keys: {
        "0,0": { action: "switch_layer", layer: 2, label: "Two" },
        "0,1": { action: "shortcut", keys: ["cmd", "t"], label: "New Tab" },
      },
    },
    1: { name: "One", triggerApp: "com.apple.Notes", keys: {} },
    2: {
      name: "Two",
      keys: { "1,0": { action: "switch_layer", layer: 1 } },
    },
  },
  settings: { defaultLayer: 2 },
});

describe("key edits", () => {
  it("sets an action without touching the input", () => {
    const before = keymap();
    const after = setKeyAction(before, 1, "2,3", { action: "cycle_layer" });
    expect(getAction(after, 1, "2,3")).toEqual({ action: "cycle_layer" });
    expect(getAction(before, 1, "2,3")).toBeUndefined();
    expect(after.layers[0]).toBe(before.layers[0]);
  });

  it("clears a key", () => {
    const after = clearKey(keymap(), 0, "0,1");
    expect(getAction(after, 0, "0,1")).toBeUndefined();
    expect(getAction(after, 0, "0,0")).toBeDefined();
  });

  it("sets and removes a label", () => {
    const labeled = setLabel(keymap(), 0, "0,1", "Tab");
    expect(getAction(labeled, 0, "0,1")?.label).toBe("Tab");
    const unlabeled = setLabel(labeled, 0, "0,1", "");
    expect(getAction(unlabeled, 0, "0,1")).toEqual({
      action: "shortcut",
      keys: ["cmd", "t"],
    });
  });

  it("ignores a label on an empty key", () => {
    const before = keymap();
    expect(setLabel(before, 0, "2,3", "Nothing")).toBe(before);
  });

  it("throws on a missing layer", () => {
    expect(() => clearKey(keymap(), 9, "0,0")).toThrow(
      "Layer 9 does not exist",
    );
  });
});

describe("layer edits", () => {
  it("adds a layer after the highest ID", () => {
    const { keymap: after, layer } = addLayer(keymap(), "Three");
    expect(layer).toBe(3);
    expect(after.layers[3]).toEqual({ name: "Three", keys: {} });
  });

  it("renames a layer", () => {
    expect(renameLayer(keymap(), 1, "Notes").layers[1].name).toBe("Notes");
  });

  it("duplicates a layer without its trigger app", () => {
    const { keymap: after, layer } = duplicateLayer(keymap(), 1, "One copy");
    expect(after.layers[layer]).toEqual({ name: "One copy", keys: {} });
    expect(after.layers[1].triggerApp).toBe("com.apple.Notes");
  });

  it("sets and clears a trigger app", () => {
    const set = setLayerTrigger(keymap(), 2, "com.figma.Desktop");
    expect(set.layers[2].triggerApp).toBe("com.figma.Desktop");
    expect(setLayerTrigger(set, 2, undefined).layers[2]).not.toHaveProperty(
      "triggerApp",
    );
  });

  it("deletes a layer, clears keys that switched to it, and stays valid", () => {
    const { keymap: after, cleared } = deleteLayer(keymap(), 2);
    expect(layerIds(after)).toEqual([0, 1]);
    expect(cleared).toEqual([{ layer: 0, pos: "0,0" }]);
    expect(getAction(after, 0, "0,0")).toBeUndefined();
    expect(after.settings?.defaultLayer).toBeUndefined();
    expect(() => assertKeymap(after)).not.toThrow();
  });

  it("never deletes layer 0", () => {
    expect(() => deleteLayer(keymap(), 0)).toThrow();
  });

  it("moves a layer and keeps references pointing at it", () => {
    const after = moveLayer(keymap(), 2, 0);
    expect(after.layers[1].name).toBe("Two");
    expect(after.layers[2].name).toBe("One");
    expect(getAction(after, 0, "0,0")).toMatchObject({ layer: 1 });
    expect(getAction(after, 1, "1,0")).toMatchObject({ layer: 2 });
    expect(after.settings?.defaultLayer).toBe(1);
    expect(() => assertKeymap(after)).not.toThrow();
  });

  it("keeps sparse layer IDs when moving", () => {
    const sparse: Keymap = {
      ...keymap(),
      layers: {
        0: keymap().layers[0],
        3: { name: "A", keys: {} },
        7: { name: "B", keys: {} },
      },
      settings: {},
    };
    const after = moveLayer(sparse, 7, 0);
    expect(layerIds(after)).toEqual([0, 3, 7]);
    expect(after.layers[3].name).toBe("B");
  });

  it("toggles following the front app, which defaults on", () => {
    expect(autoSwitchLayers(keymap())).toBe(true);
    expect(autoSwitchLayers(setAutoSwitchLayers(keymap(), false))).toBe(false);
  });
});

describe("findShortcutConflict", () => {
  it("finds the same chord on another key of the layer", () => {
    expect(
      findShortcutConflict(keymap(), { layer: 0, pos: "1,1" }, [
        "command",
        "t",
      ]),
    ).toBe("0,1");
  });

  it("ignores the key itself and other layers", () => {
    expect(
      findShortcutConflict(keymap(), { layer: 0, pos: "0,1" }, ["cmd", "t"]),
    ).toBeNull();
    expect(
      findShortcutConflict(keymap(), { layer: 1, pos: "0,1" }, ["cmd", "t"]),
    ).toBeNull();
  });

  it("works on the bundled default", () => {
    expect(
      findShortcutConflict(
        MACRO_ELEVEN_DEFAULT_KEYMAP,
        { layer: 1, pos: "0,0" },
        ["cmd", "t"],
      ),
    ).toBe("0,1");
  });
});
