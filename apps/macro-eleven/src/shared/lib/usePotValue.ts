import { useEffect, useState } from "react";
import type { PotEvent } from "../../entities/key";
import { unlistenAll } from "./listeners";
import { onPotValue } from "./tauri";

export function usePotValue() {
  const [potState, setPotState] = useState<PotEvent>({ value: 0, layer: 0 });

  useEffect(() => {
    const listeners = [
      onPotValue((event) => {
        setPotState((current) =>
          current.value === event.value && current.layer === event.layer
            ? current
            : event,
        );
      }),
    ];
    return () => unlistenAll(listeners);
  }, []);

  return potState;
}
