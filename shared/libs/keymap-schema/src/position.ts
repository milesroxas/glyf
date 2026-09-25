import type { MatrixPosition, MatrixPositionKey } from "./types";

const POSITION_PATTERN = /^(\d+),(\d+)$/;

export function isValidMatrixPosition(pos: string): pos is MatrixPositionKey {
  return POSITION_PATTERN.test(pos);
}

export function parseMatrixPosition(pos: MatrixPositionKey): MatrixPosition {
  const [row, col] = pos.split(",").map(Number);
  return { row, col };
}

export function formatMatrixPosition({
  row,
  col,
}: MatrixPosition): MatrixPositionKey {
  return `${row},${col}`;
}
