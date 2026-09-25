/**
 * Macro Eleven's physical layout, derived from the shared device file so the
 * grid, keyboard navigation, and the host agree on which keys exist.
 */
import {
  deviceKeys,
  MACRO_ELEVEN,
  type MatrixPosition,
} from "@glyf/keymap-schema";

/** Physical keys in firmware bit order (the index in key-state reports). */
export const KEY_POSITIONS: readonly MatrixPosition[] =
  deviceKeys(MACRO_ELEVEN);

const { rows, cols } = MACRO_ELEVEN.matrix;

function keyAt(row: number, col: number): MatrixPosition | null {
  return KEY_POSITIONS.find((p) => p.row === row && p.col === col) ?? null;
}

/** Grid rows for rendering; null where the matrix has no key ([0,3] holds the knob). */
export const MATRIX_LAYOUT: readonly (MatrixPosition | null)[][] = Array.from(
  { length: rows },
  (_, row) => Array.from({ length: cols }, (_, col) => keyAt(row, col)),
);

/** Index of a key in `KEY_POSITIONS` (and in key-state reports). */
export function matrixToIndex({ row, col }: MatrixPosition): number {
  return KEY_POSITIONS.findIndex((p) => p.row === row && p.col === col);
}

export type Direction = "up" | "down" | "left" | "right";

/**
 * The key next to `from` in `direction`, skipping cells without a key. Moving
 * up or down into a row without that column lands on the nearest key in the
 * row. Returns `from` at the edge.
 */
export function neighborKey(
  from: MatrixPosition,
  direction: Direction,
): MatrixPosition {
  if (direction === "left" || direction === "right") {
    const step = direction === "left" ? -1 : 1;
    for (let col = from.col + step; col >= 0 && col < cols; col += step) {
      const key = keyAt(from.row, col);
      if (key) return key;
    }
    return from;
  }
  const step = direction === "up" ? -1 : 1;
  for (let row = from.row + step; row >= 0 && row < rows; row += step) {
    const inRow = KEY_POSITIONS.filter((p) => p.row === row);
    if (inRow.length === 0) continue;
    return inRow.reduce((best, key) =>
      Math.abs(key.col - from.col) < Math.abs(best.col - from.col) ? key : best,
    );
  }
  return from;
}
