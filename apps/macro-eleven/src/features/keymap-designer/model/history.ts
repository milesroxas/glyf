/**
 * Undo history for the designer. Each entry remembers where the user was
 * (layer and key), so undo and redo take them back to the change they
 * reverse instead of changing something off screen.
 */
import type { Keymap, MatrixPositionKey } from "../../../entities/keymap";

/** Where the user is looking: a layer, and optionally a key on it. */
export interface Focus {
  layer: number;
  selected: MatrixPositionKey | null;
}

export interface Snapshot {
  keymap: Keymap;
  focus: Focus;
}

export interface HistoryState {
  past: Snapshot[];
  present: Snapshot | null;
  future: Snapshot[];
  /** Edits with the same key merge into one step (typing a label). */
  coalesce: string | null;
}

export type HistoryAction =
  | { type: "reset"; snapshot: Snapshot }
  | {
      type: "apply";
      keymap: Keymap;
      /** Where the edit was made, in the old keymap. */
      before: Focus;
      /** Where to look afterwards, in the new keymap. */
      after: Focus;
      coalesce?: string;
    }
  | { type: "undo" }
  | { type: "redo" };

const LIMIT = 200;

export const EMPTY_HISTORY: HistoryState = {
  past: [],
  present: null,
  future: [],
  coalesce: null,
};

export function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  switch (action.type) {
    case "reset":
      return { ...EMPTY_HISTORY, present: action.snapshot };

    case "apply": {
      const { present } = state;
      if (!present || action.keymap === present.keymap) return state;
      const next = { keymap: action.keymap, focus: action.after };
      if (action.coalesce && action.coalesce === state.coalesce) {
        return { ...state, present: next, future: [] };
      }
      return {
        past: [...state.past, { ...present, focus: action.before }].slice(
          -LIMIT,
        ),
        present: next,
        future: [],
        coalesce: action.coalesce ?? null,
      };
    }

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous || !state.present) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        coalesce: null,
      };
    }

    case "redo": {
      const [next, ...future] = state.future;
      if (!next || !state.present) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future,
        coalesce: null,
      };
    }
  }
}
