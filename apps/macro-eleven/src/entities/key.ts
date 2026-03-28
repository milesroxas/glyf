import type { MatrixPosition, KeyEvent as SchemaKeyEvent } from '@glyf/keymap-schema';

export type { MatrixPosition };

/**
 * Legacy key event format (state of all keys)
 * @deprecated Use individual KeyPressEvent instead
 */
export interface KeyEvent {
  keys: boolean[];
  layer: number;
}

/**
 * Individual key press/release event
 */
export interface KeyPressEvent extends SchemaKeyEvent {
  position: MatrixPosition;
  pressed: boolean;
  timestamp: number;
}

export interface PotEvent {
  value: number;
  layer: number;
}

// Physical layout: row 0 has 3 keys, rows 1-2 have 4 keys each. [0,3] is empty.
// Matrix indices map to the flat LAYOUT() order:
// 0=[0,0] 1=[0,1] 2=[0,2]
// 3=[1,0] 4=[1,1] 5=[1,2] 6=[1,3]
// 7=[2,0] 8=[2,1] 9=[2,2] 10=[2,3]
export const MATRIX_LAYOUT: (MatrixPosition | null)[][] = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, null],
  [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }],
  [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }],
];

// Map matrix position to flat key index (0-10)
export function matrixToIndex(row: number, col: number): number {
  if (row === 0) return col; // 0, 1, 2
  if (row === 1) return 3 + col; // 3, 4, 5, 6
  return 7 + col; // 7, 8, 9, 10
}
