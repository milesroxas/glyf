import { useEffect, useRef } from "react";
import { setOverlayDimmed } from "../../shared/lib/tauri";

/** Idle this long, the overlay fades. */
const IDLE_MS = 4000;

/**
 * Fade the overlay after a while with nothing happening on the pad, and
 * bring it back the moment something does or the pointer comes over it.
 * `activity` changes whenever the pad is used. The host runs the fade, so
 * the glass fades with the keys.
 */
export function useIdleFade(enabled: boolean, activity: string) {
  const dimmed = useRef(false);
  const pointerInside = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const wake = () => {
    if (dimmed.current) {
      dimmed.current = false;
      setOverlayDimmed(false).catch(() => {});
    }
  };

  const schedule = () => {
    clearTimeout(timer.current);
    if (!enabled) return;
    timer.current = setTimeout(() => {
      if (pointerInside.current) return;
      dimmed.current = true;
      setOverlayDimmed(true).catch(() => {});
    }, IDLE_MS);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `activity` is the trigger
  useEffect(() => {
    wake();
    schedule();
    return () => clearTimeout(timer.current);
  }, [enabled, activity]);

  return {
    onPointerEnter: () => {
      pointerInside.current = true;
      clearTimeout(timer.current);
      wake();
    },
    onPointerLeave: () => {
      pointerInside.current = false;
      schedule();
    },
  };
}
