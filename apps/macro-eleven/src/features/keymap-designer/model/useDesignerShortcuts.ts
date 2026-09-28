import { useEffect, useRef } from "react";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

interface Shortcuts {
  /** Left out, ⌘Z and ⇧⌘Z do nothing here. */
  undo?: () => void;
  redo?: () => void;
  /** Layer IDs in sidebar order, for ⌘1-⌘9. */
  layerIds: () => number[];
  setLayer: (layer: number) => void;
}

/**
 * ⌘Z / ⇧⌘Z undo and redo, and ⌘1-⌘9 show a layer. Text fields keep their
 * own undo.
 */
export function useDesignerShortcuts(shortcuts: Shortcuts) {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey) return;
      const { undo, redo, layerIds, setLayer } = latest.current;
      if (event.code === "KeyZ") {
        const run = event.shiftKey ? redo : undo;
        if (!run || isEditable(event.target)) return;
        event.preventDefault();
        run();
        return;
      }
      const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
      const id =
        digit && !event.shiftKey ? layerIds()[Number(digit) - 1] : undefined;
      if (id !== undefined) {
        event.preventDefault();
        setLayer(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
