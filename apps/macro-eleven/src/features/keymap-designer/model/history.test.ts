import { MACRO_ELEVEN_DEFAULT_KEYMAP, setLabel } from "@glyf/keymap-schema";
import { describe, expect, it } from "vitest";
import { EMPTY_HISTORY, type Focus, historyReducer } from "./history";

const base = MACRO_ELEVEN_DEFAULT_KEYMAP;
const at = (layer: number, selected: Focus["selected"]): Focus => ({
  layer,
  selected,
});

function start() {
  return historyReducer(EMPTY_HISTORY, {
    type: "reset",
    snapshot: { keymap: base, focus: at(0, null) },
  });
}

describe("historyReducer", () => {
  it("records edits and walks back and forth", () => {
    const one = setLabel(base, 0, "0,1", "One");
    const two = setLabel(one, 1, "0,2", "Two");
    let state = start();
    state = historyReducer(state, {
      type: "apply",
      keymap: one,
      before: at(0, "0,1"),
      after: at(0, "0,1"),
    });
    state = historyReducer(state, {
      type: "apply",
      keymap: two,
      before: at(1, "0,2"),
      after: at(1, "0,2"),
    });

    state = historyReducer(state, { type: "undo" });
    expect(state.present?.keymap).toBe(one);
    // Undo returns to where the undone change was made
    expect(state.present?.focus).toEqual(at(1, "0,2"));

    state = historyReducer(state, { type: "redo" });
    expect(state.present?.keymap).toBe(two);
    expect(state.present?.focus).toEqual(at(1, "0,2"));
  });

  it("merges a run of edits with the same key into one step", () => {
    let state = start();
    for (const label of ["N", "Ne", "New"]) {
      state = historyReducer(state, {
        type: "apply",
        keymap: setLabel(state.present?.keymap ?? base, 0, "0,1", label),
        before: at(0, "0,1"),
        after: at(0, "0,1"),
        coalesce: "label:0:0,1",
      });
    }
    expect(state.past).toHaveLength(1);
    state = historyReducer(state, { type: "undo" });
    expect(state.present?.keymap).toBe(base);
  });

  it("drops redo after a new edit and ignores no-op edits", () => {
    let state = start();
    const edited = setLabel(base, 0, "0,1", "X");
    state = historyReducer(state, {
      type: "apply",
      keymap: edited,
      before: at(0, null),
      after: at(0, null),
    });
    state = historyReducer(state, { type: "undo" });
    expect(state.future).toHaveLength(1);
    const same = historyReducer(state, {
      type: "apply",
      keymap: state.present?.keymap ?? base,
      before: at(0, null),
      after: at(0, null),
    });
    expect(same).toBe(state);
    state = historyReducer(state, {
      type: "apply",
      keymap: setLabel(base, 0, "0,2", "Y"),
      before: at(0, null),
      after: at(0, null),
    });
    expect(state.future).toHaveLength(0);
  });

  it("does nothing past either end", () => {
    const state = start();
    expect(historyReducer(state, { type: "undo" })).toBe(state);
    expect(historyReducer(state, { type: "redo" })).toBe(state);
  });
});
