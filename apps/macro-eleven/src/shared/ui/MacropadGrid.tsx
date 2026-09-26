import type { MatrixPosition } from "@glyf/keymap-schema";
import type { ReactNode } from "react";
import { MATRIX_LAYOUT, matrixToIndex } from "../config/layout";
import { cn } from "../lib/utils";
import "./pad.css";

interface MacropadGridProps {
  /** `index` is the key's position in key-state reports. */
  renderKey: (position: MatrixPosition, index: number) => ReactNode;
  /** Renders content in the physical empty cell at [row 0, col 3] (where the knob sits). */
  renderEmpty?: () => ReactNode;
  className?: string;
}

/**
 * The pad's 3-4-4 key grid in its physical arrangement. Keys are square and
 * `--key` wide (72 px unless an ancestor sets it; see pad.css).
 */
export function MacropadGrid({
  renderKey,
  renderEmpty,
  className,
}: MacropadGridProps) {
  return (
    <div className={cn("pad", className)}>
      {MATRIX_LAYOUT.flatMap((row) => {
        const rowKey = row
          .map((pos) => (pos ? `${pos.row},${pos.col}` : "empty"))
          .join("|");
        return row.map((pos) =>
          pos ? (
            <div key={`${pos.row},${pos.col}`}>
              {renderKey(pos, matrixToIndex(pos))}
            </div>
          ) : (
            <div
              key={`${rowKey}-empty`}
              className={cn(
                renderEmpty &&
                  "flex items-center justify-center @container-[size]",
              )}
            >
              {renderEmpty?.()}
            </div>
          ),
        );
      })}
    </div>
  );
}
