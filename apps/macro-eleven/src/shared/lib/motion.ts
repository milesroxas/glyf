/**
 * Motion tokens. Springs are critically damped by default (no overshoot) so
 * they can be interrupted and re-targeted from their current value; bounce is
 * reserved for gestures that carry momentum.
 */
import type { Transition } from "motion/react";

/** Default UI spring: selection ring, live-layer dot, section collapse, sheet open. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.3 };

/** After a throw or drag release: a little bounce, because force preceded it. */
export const SPRING_MOMENTUM: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
};

/** Strong ease-out (matches `--ease-out` in App.css). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Content swaps in place: opacity only, the container never moves. */
export const CROSSFADE: Transition = { duration: 0.15, ease: EASE_OUT };

/** Something that comes and goes in place: opacity only. */
export const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: CROSSFADE,
} as const;

/**
 * A short label that changes in place (a status, a percentage). The two
 * states pass through a 2 px blur, so they read as one label changing
 * rather than two overlapping.
 */
export const LABEL_SWAP = {
  initial: { opacity: 0, filter: "blur(2px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(2px)" },
  transition: CROSSFADE,
} as const;

/**
 * A small mark that comes and goes (a badge, a dot). Small things start
 * further from full size than large ones to read the same.
 */
export const POP = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
  transition: CROSSFADE,
} as const;

/**
 * Where a flick is heading: Apple's scroll-deceleration projection.
 * `velocity` in px/s, returns px.
 */
export function projectMomentum(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}
