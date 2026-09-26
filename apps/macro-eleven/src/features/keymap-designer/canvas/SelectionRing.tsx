import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { SPRING } from "../../../shared/lib/motion";

/** Gap between a key and the ring around it. */
const OFFSET = 4;

/**
 * One ring that moves between keys. Each move springs from wherever the ring
 * is on screen, so a second click mid-flight redirects it without a jump.
 * It measures layout offsets, not transforms, so a key held down on the pad
 * does not nudge it.
 */
export function SelectionRing({
  selectedKey,
  container,
}: {
  /** `data-key-pos` of the selected key. */
  selectedKey: string | null;
  container: HTMLElement | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const [size, setSize] = useState({ width: 0, height: 0, borderRadius: 0 });
  const shown = useRef(false);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const target =
      selectedKey && container
        ? container.querySelector<HTMLElement>(
            `[data-key-pos="${selectedKey}"]`,
          )
        : null;
    if (!target || !container) {
      shown.current = false;
      animate(opacity, 0, { duration: 0.12 });
      return;
    }
    const place = (move: boolean) => {
      let left = 0;
      let top = 0;
      for (
        let node: HTMLElement | null = target;
        node && node !== container;
        node = node.offsetParent as HTMLElement | null
      ) {
        left += node.offsetLeft;
        top += node.offsetTop;
      }
      // Concentric with the key, whose corners follow its size
      const radius = Number.parseFloat(
        getComputedStyle(target).borderTopLeftRadius,
      );
      setSize({
        width: target.offsetWidth + OFFSET * 2,
        height: target.offsetHeight + OFFSET * 2,
        borderRadius: (radius || 0) + OFFSET,
      });
      if (move && shown.current && !reduceMotion) {
        animate(x, left - OFFSET, SPRING);
        animate(y, top - OFFSET, SPRING);
      } else {
        // Appearing, resizing, or reduced motion: be there, don't travel
        x.jump(left - OFFSET);
        y.jump(top - OFFSET);
      }
      shown.current = true;
      animate(opacity, 1, { duration: 0.12 });
    };
    place(true);
    // Re-place without travel when the pad resizes. The observer also
    // reports once on start; that is not a resize, so skip it.
    let width = container.offsetWidth;
    let height = container.offsetHeight;
    const observer = new ResizeObserver(() => {
      if (
        container.offsetWidth === width &&
        container.offsetHeight === height
      ) {
        return;
      }
      width = container.offsetWidth;
      height = container.offsetHeight;
      place(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedKey, container, reduceMotion, opacity, x, y]);

  return (
    <motion.div
      aria-hidden
      style={{ x, y, opacity, ...size }}
      className="pointer-events-none absolute top-0 left-0 ring-2 ring-primary shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
    />
  );
}
