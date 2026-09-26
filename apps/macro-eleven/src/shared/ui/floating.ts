/**
 * Placement shared by every floating surface (popover, menu, select,
 * tooltip): the gap from the trigger, and the margin kept from the window
 * edge. Radix flips the surface to the side with more room and reports the
 * space left there as `--radix-*-content-available-height`, which each
 * surface uses as its max height, so none can run past the window.
 */
export const FLOATING_PLACEMENT = {
  sideOffset: 6,
  collisionPadding: 8,
} as const;
