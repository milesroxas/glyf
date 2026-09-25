/**
 * Motion tokens. Springs are critically damped by default (no overshoot) so
 * they can be interrupted and re-targeted from their current value; bounce is
 * reserved for gestures that carry momentum.
 */
import type { Transition } from "motion/react";

/** Default UI spring: selection ring, tab indicator, sheet open. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.3 };

/** After a throw or drag release: a little bounce, because force preceded it. */
export const SPRING_MOMENTUM: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
};

/** Strong ease-out (matches `--ease-out` in App.css). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Content swaps in place: opacity only, the container never moves. */
export const CROSSFADE: Transition = { duration: 0.15, ease: EASE_OUT };

/**
 * Where a flick is heading: Apple's scroll-deceleration projection.
 * `velocity` in px/s, returns px.
 */
export function projectMomentum(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}
