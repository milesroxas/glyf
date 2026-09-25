import { describe, expect, it } from "vitest";
import {
  KEY_POSITIONS,
  MATRIX_LAYOUT,
  matrixToIndex,
  neighborKey,
} from "./layout";

describe("layout", () => {
  it("has 11 keys and leaves [0,3] for the knob", () => {
    expect(KEY_POSITIONS).toHaveLength(11);
    expect(MATRIX_LAYOUT[0][3]).toBeNull();
  });

  it("maps positions to report indexes and back", () => {
    KEY_POSITIONS.forEach((position, index) => {
      expect(matrixToIndex(position)).toBe(index);
    });
  });

  it.each([
    [{ row: 0, col: 0 }, "right", { row: 0, col: 1 }],
    [{ row: 0, col: 2 }, "right", { row: 0, col: 2 }],
    [{ row: 1, col: 3 }, "up", { row: 0, col: 2 }],
    [{ row: 0, col: 2 }, "down", { row: 1, col: 2 }],
    [{ row: 2, col: 0 }, "down", { row: 2, col: 0 }],
    [{ row: 1, col: 0 }, "left", { row: 1, col: 0 }],
  ] as const)("moves from %o %s to %o", (from, direction, to) => {
    expect(neighborKey(from, direction)).toEqual(to);
  });
});
