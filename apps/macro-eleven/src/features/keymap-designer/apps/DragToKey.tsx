/**
 * Drag an app from the picker onto a key. The ghost follows the pointer 1:1
 * from where it was grabbed; the key under it lights up; releasing over a key
 * assigns the app, and releasing anywhere else throws the ghost back to its
 * row with the release velocity. Esc cancels mid-drag.
 */
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { InstalledApp } from "../../../entities/app";
import type { MatrixPositionKey } from "../../../entities/keymap";
import { SPRING_MOMENTUM } from "../../../shared/lib/motion";
import { AppIcon } from "../../../shared/ui/AppIcon";

/** Pointer travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 4;
/** The ghost is a compact chip; the pointer stays over its icon. */
const GHOST_GRAB_MAX_X = 24;
/** Pointer samples used for the release velocity. */
const VELOCITY_WINDOW_MS = 80;

interface DragContextValue {
  /** The key under a dragged app. */
  hoverPos: MatrixPositionKey | null;
  /**
   * Start tracking a press on a draggable row. Returns a function that tells
   * whether the press turned into a drag, so the row can ignore its click.
   */
  begin: (
    event: ReactPointerEvent<HTMLElement>,
    app: InstalledApp,
    onDrop: (pos: MatrixPositionKey, app: InstalledApp) => void,
  ) => () => boolean;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDragToKey(): DragContextValue {
  const context = useContext(DragContext);
  if (!context) throw new Error("useDragToKey needs a DragToKeyProvider");
  return context;
}

function keyUnder(x: number, y: number): MatrixPositionKey | null {
  const tile = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-key-pos]");
  return (tile?.dataset.keyPos as MatrixPositionKey | undefined) ?? null;
}

interface Sample {
  x: number;
  y: number;
  t: number;
}

function releaseVelocity(samples: Sample[]) {
  const last = samples[samples.length - 1];
  const first = samples.find((s) => last && last.t - s.t <= VELOCITY_WINDOW_MS);
  if (!last || !first || last.t === first.t) return { x: 0, y: 0 };
  const seconds = (last.t - first.t) / 1000;
  return { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
}

export function DragToKeyProvider({ children }: { children: ReactNode }) {
  const [hoverPos, setHoverPos] = useState<MatrixPositionKey | null>(null);
  const [ghost, setGhost] = useState<InstalledApp | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);
  const reduceMotion = useReducedMotion();
  const reduce = useRef(reduceMotion);
  reduce.current = reduceMotion;

  const begin = useCallback<DragContextValue["begin"]>(
    (event, app, onDrop) => {
      if (event.button !== 0) return () => false;
      const row = event.currentTarget;
      const origin = row.getBoundingClientRect();
      const grab = {
        x: Math.min(event.clientX - origin.left, GHOST_GRAB_MAX_X),
        y: event.clientY - origin.top,
      };
      const start = { x: event.clientX, y: event.clientY };
      const samples: Sample[] = [];
      let dragging = false;
      let hover: MatrixPositionKey | null = null;
      row.setPointerCapture(event.pointerId);

      const finish = () => {
        document.body.style.userSelect = "";
        row.removeEventListener("pointermove", onMove);
        row.removeEventListener("pointerup", onUp);
        row.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey, true);
        if (row.hasPointerCapture(event.pointerId)) {
          row.releasePointerCapture(event.pointerId);
        }
        setHoverPos(null);
      };

      // Missed: throw the ghost home with the pointer's velocity
      const returnHome = () => {
        finish();
        if (!dragging) return;
        if (reduce.current) {
          setGhost(null);
          return;
        }
        const velocity = releaseVelocity(samples);
        animate(scale, 1, SPRING_MOMENTUM);
        animate(x, origin.left, { ...SPRING_MOMENTUM, velocity: velocity.x });
        animate(y, origin.top, {
          ...SPRING_MOMENTUM,
          velocity: velocity.y,
        }).then(() => setGhost(null));
      };

      const onMove = (move: PointerEvent) => {
        if (!dragging) {
          const distance = Math.hypot(
            move.clientX - start.x,
            move.clientY - start.y,
          );
          if (distance < DRAG_THRESHOLD_PX) return;
          dragging = true;
          // A drag is not a text selection
          document.body.style.userSelect = "none";
          window.getSelection()?.removeAllRanges();
          x.jump(origin.left);
          y.jump(origin.top);
          opacity.jump(1);
          scale.jump(1);
          animate(scale, 1.04, { duration: 0.15 });
          setGhost(app);
        }
        x.set(move.clientX - grab.x);
        y.set(move.clientY - grab.y);
        samples.push({ x: move.clientX, y: move.clientY, t: move.timeStamp });
        if (samples.length > 12) samples.shift();
        hover = keyUnder(move.clientX, move.clientY);
        setHoverPos(hover);
      };

      const onUp = () => {
        if (!dragging || !hover) {
          returnHome();
          return;
        }
        const target = hover;
        finish();
        onDrop(target, app);
        // Dropped: the ghost settles into the key
        animate(opacity, 0, { duration: 0.15 });
        animate(scale, 0.9, { duration: 0.15 }).then(() => setGhost(null));
      };

      const onCancel = () => returnHome();
      const onKey = (key: KeyboardEvent) => {
        if (key.key === "Escape" && dragging) {
          key.preventDefault();
          key.stopPropagation();
          returnHome();
        }
      };

      row.addEventListener("pointermove", onMove);
      row.addEventListener("pointerup", onUp);
      row.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey, true);
      return () => dragging;
    },
    [opacity, scale, x, y],
  );

  const value = useMemo(() => ({ hoverPos, begin }), [hoverPos, begin]);

  return (
    <DragContext.Provider value={value}>
      {children}
      {ghost &&
        createPortal(
          <motion.div
            aria-hidden
            style={{ x, y, scale, opacity }}
            className="pointer-events-none fixed top-0 left-0 z-[100] flex max-w-56 items-center gap-2 rounded-lg border bg-popover/95 py-1.5 pr-3 pl-2 text-sm shadow-xl will-change-transform"
          >
            <AppIcon app={ghost} className="size-5" />
            <span className="truncate font-medium">{ghost.name}</span>
          </motion.div>,
          document.body,
        )}
    </DragContext.Provider>
  );
}
