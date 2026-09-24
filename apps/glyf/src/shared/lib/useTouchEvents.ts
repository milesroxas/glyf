import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { TouchEvent } from "../../entities/touch";
import { onTouchEvent } from "./tauri";

export function useTouchEvents() {
  const [lastTouch, setLastTouch] = useState<TouchEvent | null>(null);
  const [history, setHistory] = useState<TouchEvent[]>([]);

  useEffect(() => {
    let cleanup: UnlistenFn | null = null;
    let disposed = false;

    void onTouchEvent((event) => {
      setLastTouch(event);
      if (event.pressed) {
        setHistory((prev) => {
          const next = [...prev, event];
          // Keep last 200 points to avoid unbounded growth
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      }
    })
      .then((fn) => {
        if (disposed) {
          fn();
          return;
        }
        cleanup = fn;
      })
      .catch((error) => {
        console.error("Failed to subscribe to touch events", error);
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  const clearHistory = () => setHistory([]);

  return { lastTouch, history, clearHistory };
}
