import { useEffect, useState } from "react";
import { onTouchEvent } from "./tauri";
import type { TouchEvent } from "../../entities/touch";

export function useTouchEvents() {
  const [lastTouch, setLastTouch] = useState<TouchEvent | null>(null);
  const [history, setHistory] = useState<TouchEvent[]>([]);

  useEffect(() => {
    const unlisten = onTouchEvent((event) => {
      setLastTouch(event);
      if (event.pressed) {
        setHistory((prev) => {
          const next = [...prev, event];
          // Keep last 200 points to avoid unbounded growth
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const clearHistory = () => setHistory([]);

  return { lastTouch, history, clearHistory };
}
