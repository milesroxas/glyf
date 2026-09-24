import { MATRIX_LAYOUT, matrixToIndex } from "../../entities/key";
import { cn } from "../lib/utils";

interface MacropadGridProps {
  renderKey: (index: number) => React.ReactNode;
  /** When true, cells fill available space (for overlay). Default: fixed 80×64 px cells. */
  fluid?: boolean;
  /** Renders content in the physical empty cell at [row 0, col 3] (where the knob sits). */
  renderEmpty?: () => React.ReactNode;
}

export function MacropadGrid({
  renderKey,
  fluid,
  renderEmpty,
}: MacropadGridProps) {
  return (
    <div
      className={cn("flex flex-col gap-1.5", fluid && "flex-1 min-h-0 min-w-0")}
    >
      {MATRIX_LAYOUT.map((row) => {
        const rowKey = row
          .map((pos) => (pos ? `${pos.row},${pos.col}` : "empty"))
          .join("|");
        return (
          <div
            key={rowKey}
            className={cn("flex gap-1.5", fluid && "flex-1 min-h-0")}
          >
            {row.map((pos) => {
              if (!pos) {
                return (
                  <div
                    key={`${rowKey}-empty`}
                    className={cn(
                      fluid ? "flex-1 min-w-0 min-h-0" : "w-20 h-16",
                      renderEmpty
                        ? "flex items-center justify-center @container-[size]"
                        : "invisible",
                    )}
                  >
                    {renderEmpty?.()}
                  </div>
                );
              }
              const index = matrixToIndex(pos.row, pos.col);
              return (
                <div
                  key={`${pos.row},${pos.col}`}
                  className={cn(fluid ? "flex-1 min-w-0 min-h-0" : "w-20 h-16")}
                >
                  {renderKey(index)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
