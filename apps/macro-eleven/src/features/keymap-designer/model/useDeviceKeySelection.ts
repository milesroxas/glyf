import { formatMatrixPosition } from "@glyf/keymap-schema";
import { useEffect, useRef } from "react";
import type { MatrixPositionKey } from "../../../entities/keymap";
import { unlistenAll } from "../../../shared/lib/listeners";
import { onKeyPress } from "../../../shared/lib/tauri";

/**
 * Call `onPress` on the press edge of each physical key while `enabled`.
 * This is "press a key to select it".
 */
export function useDeviceKeySelection(
  enabled: boolean,
  onPress: (pos: MatrixPositionKey) => void,
) {
  const latest = useRef(onPress);
  latest.current = onPress;

  useEffect(() => {
    if (!enabled) return;
    const listeners = [
      onKeyPress((event) => {
        if (event.pressed) latest.current(formatMatrixPosition(event.position));
      }),
    ];
    return () => unlistenAll(listeners);
  }, [enabled]);
}
