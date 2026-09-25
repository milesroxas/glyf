import { useCallback, useRef, useState } from "react";
import type { Keymap, MatrixPositionKey } from "../../../entities/keymap";
import {
  EMPTY_HISTORY,
  type Focus,
  type HistoryAction,
  type HistoryState,
  historyReducer,
} from "./history";

/**
 * The keymap's undo history and where the user is looking. Handlers that
 * outlive a render (keyboard shortcuts, IPC events) read `latest()`.
 */
export function useHistoryState() {
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);
  const [focus, setFocus] = useState<Focus>({ layer: 0, selected: null });
  const latest = useRef({ history, focus });

  const commit = useCallback((action: HistoryAction) => {
    const next = historyReducer(latest.current.history, action);
    latest.current.history = next;
    setHistory(next);
    return next;
  }, []);

  /** Look at `target`, falling back to layer 0 if its layer is gone. */
  const navigate = useCallback((target: Focus) => {
    const layers = latest.current.history.present?.keymap.layers;
    const next =
      layers && !(target.layer in layers)
        ? { layer: 0, selected: target.selected }
        : target;
    latest.current.focus = next;
    setFocus(next);
  }, []);

  /** Start over from a freshly loaded keymap, keeping the view. */
  const reset = useCallback(
    (keymap: Keymap) => {
      const { focus: current } = latest.current;
      commit({ type: "reset", snapshot: { keymap, focus: current } });
      navigate(current);
    },
    [commit, navigate],
  );

  // Undo and redo go back to where the reversed change was made
  const undo = useCallback(() => {
    const next = commit({ type: "undo" });
    if (next.present) navigate(next.present.focus);
  }, [commit, navigate]);

  const redo = useCallback(() => {
    const next = commit({ type: "redo" });
    if (next.present) navigate(next.present.focus);
  }, [commit, navigate]);

  const setLayer = useCallback(
    (layer: number) => navigate({ ...latest.current.focus, layer }),
    [navigate],
  );

  const select = useCallback(
    (selected: MatrixPositionKey | null) =>
      navigate({ ...latest.current.focus, selected }),
    [navigate],
  );

  return {
    history,
    focus,
    latest: useCallback(() => latest.current, []),
    commit,
    navigate,
    reset,
    undo,
    redo,
    setLayer,
    select,
  };
}
