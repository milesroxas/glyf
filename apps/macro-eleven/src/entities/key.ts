import type { MatrixPosition } from "@glyf/keymap-schema";

export type { MatrixPosition };

/** Every key's state, sent when it changes. */
export interface KeyEvent {
  keys: boolean[];
  /** Firmware layer. Under host control the host layer is what counts. */
  layer: number;
}

/** One key went down or up. */
export interface KeyPressEvent {
  position: MatrixPosition;
  pressed: boolean;
  timestamp: number;
}

export interface PotEvent {
  value: number;
  layer: number;
}
