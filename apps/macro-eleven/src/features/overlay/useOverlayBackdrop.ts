import { useEffect, useRef, useState } from "react";
import { type Backdrop, glassTint } from "../../entities/settings";
import { unlistenAll } from "../../shared/lib/listeners";
import {
  getBackdrop,
  onOverlayBackdrop,
  onOverlayPreview,
  refreshOverlayBackdrop,
} from "../../shared/lib/tauri";

const REDUCE_TRANSPARENCY = "(prefers-reduced-transparency: reduce)";
/** Until the settings load (the host's default). */
const DEFAULT_TRANSPARENCY = 0.6;

/**
 * What the overlay paints behind its keys. On glass it paints only a tint,
 * as strong as the Transparency setting says; Settings previews the tint
 * here while its slider moves. Solid paints the pad's chassis.
 */
export function useOverlayBackdrop(transparency: number | undefined) {
  const [backdrop, setBackdrop] = useState<Backdrop>("solid");
  // A preview holds until the saved value changes
  const saved = useRef(transparency);
  saved.current = transparency;
  const [preview, setPreview] = useState<{
    value: number;
    over: number | undefined;
  } | null>(null);

  useEffect(() => {
    let active = true;
    let heard = false;
    const listeners = [
      onOverlayBackdrop((next) => {
        heard = true;
        setBackdrop(next);
      }),
      onOverlayPreview((value) => setPreview({ value, over: saved.current })),
    ];
    Promise.all(listeners)
      .then(() => getBackdrop("overlay"))
      .then((next) => {
        if (active && !heard) setBackdrop(next);
      })
      .catch(() => {});
    // The host decides glass or solid; tell it when the system asks for
    // less transparency
    const query = window.matchMedia(REDUCE_TRANSPARENCY);
    const refresh = () => {
      refreshOverlayBackdrop().catch(() => {});
    };
    query.addEventListener("change", refresh);
    return () => {
      active = false;
      unlistenAll(listeners);
      query.removeEventListener("change", refresh);
    };
  }, []);

  const previewing = preview && preview.over === transparency;
  const tint = glassTint(
    previewing ? preview.value : (transparency ?? DEFAULT_TRANSPARENCY),
  );
  return { backdrop, tint };
}
