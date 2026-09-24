import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { DisplayStateEvent } from "../../entities/display";
import { onDisplayState } from "./tauri";

export function useDisplayState() {
  const [state, setState] = useState<DisplayStateEvent>({
    on: true,
    brightness: 200,
  });

  useEffect(() => {
    let cleanup: UnlistenFn | null = null;
    let disposed = false;

    void onDisplayState((event) => {
      setState(event);
    })
      .then((fn) => {
        if (disposed) {
          fn();
          return;
        }
        cleanup = fn;
      })
      .catch((error) => {
        console.error("Failed to subscribe to display state events", error);
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return state;
}
