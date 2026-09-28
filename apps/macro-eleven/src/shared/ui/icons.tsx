import { createLucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

/** A rotary knob from above: the body and its pointer. Drawn as Lucide draws. */
export const KnobIcon = createLucideIcon("knob", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "body" }],
  ["path", { d: "M12 12 8 16", key: "pointer" }],
]);

/** The eleven keys, in glyph units: four columns, the knob's place top right. */
const KEYS = [0, 5.5, 11]
  .flatMap((y) => [0, 5.33, 10.67, 16].map((x) => ({ x, y })))
  .filter(({ x, y }) => !(x === 16 && y === 0));

/**
 * Macro Eleven from above, on a dark tile: eleven keys and the knob. Stands
 * for the pad wherever the app names it (the profile, the device).
 */
export function PadGlyph({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_0_0_0_1px_var(--glass-edge)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 20 15"
        className="h-[15px] w-5 fill-foreground/85"
        role="presentation"
      >
        {KEYS.map(({ x, y }) => (
          <rect key={`${x},${y}`} x={x} y={y} width={4} height={4} rx={1} />
        ))}
        <circle cx={18} cy={2} r={2} />
      </svg>
    </span>
  );
}
