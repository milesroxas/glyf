import type { MatrixPosition } from "@glyf/keymap-schema";
import type { ReactNode } from "react";
import { MATRIX_LAYOUT, matrixToIndex } from "../config/layout";
import { cn } from "../lib/utils";

interface MacropadGridProps {
  /** `index` is the key's position in key-state reports. */
  renderKey: (position: MatrixPosition, index: number) => ReactNode;
  /** When true, cells fill available space (for overlay). Default: fixed 80×64 px cells. */
  fluid?: boolean;
  /** Renders content in the physical empty cell at [row 0, col 3] (where the knob sits). */
  renderEmpty?: () => ReactNode;
  className?: string;
}

/** The pad's 3-4-4 key grid in its physical arrangement. */
export function MacropadGrid({
  renderKey,
  fluid,
  renderEmpty,
  className,
}: MacropadGridProps) {
  const cell = fluid ? "flex-1 min-w-0 min-h-0" : "w-20 h-16";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        fluid && "flex-1 min-h-0 min-w-0",
        className,
      )}
    >
      {MATRIX_LAYOUT.map((row) => {
        const rowKey = row
          .map((pos) => (pos ? `${pos.row},${pos.col}` : "empty"))
          .join("|");
        return (
          <div
            key={rowKey}
            className={cn("flex gap-2", fluid && "flex-1 min-h-0")}
          >
            {row.map((pos) =>
              pos ? (
                <div key={`${pos.row},${pos.col}`} className={cell}>
                  {renderKey(pos, matrixToIndex(pos))}
                </div>
              ) : (
                <div
                  key={`${rowKey}-empty`}
                  className={cn(
                    cell,
                    renderEmpty
                      ? "flex items-center justify-center @container-[size]"
                      : "invisible",
                  )}
                >
                  {renderEmpty?.()}
                </div>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
