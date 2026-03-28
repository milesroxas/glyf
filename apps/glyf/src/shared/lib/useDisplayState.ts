import { useEffect, useState } from "react";
import { onDisplayState } from "./tauri";
import type { DisplayStateEvent } from "../../entities/display";

export function useDisplayState() {
  const [state, setState] = useState<DisplayStateEvent>({
    on: true,
    brightness: 200,
  });

  useEffect(() => {
    const unlisten = onDisplayState((event) => {
      setState(event);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return state;
}
