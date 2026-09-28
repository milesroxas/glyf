/**
 * Toolbar controls as macOS 26 draws them: glass capsules floating over the
 * content. Related icon buttons share one capsule; a labelled button is a
 * capsule of its own. Each gives way a little under the pointer on press.
 */
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

const BUTTON = cn(
  "flex items-center justify-center rounded-full text-foreground/90 outline-none",
  "transition-[background-color,color,scale] duration-150 ease-(--ease-out)",
  "active:scale-[0.97]",
  "focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-4 [&_svg]:shrink-0",
  // Stays focusable and keeps its tooltip, but does nothing
  "aria-disabled:text-foreground/35 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100",
);

/** A capsule holding related icon buttons (undo, redo). */
export function ToolbarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "glass-capsule flex h-[34px] items-center rounded-full px-[3px]",
        className,
      )}
      {...props}
    />
  );
}

/** An icon button inside a `ToolbarGroup`. Give it an `aria-label`. */
export function ToolbarButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        BUTTON,
        "h-7 w-8 hover:bg-(--glass-hover) active:bg-(--glass-press)",
        className,
      )}
      {...props}
    />
  );
}

/** A button with a label, on its own capsule. */
export function ToolbarCapsule({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        BUTTON,
        "glass-capsule h-[34px] gap-[7px] pr-3.5 pl-3 text-[13px] font-medium hover:bg-(--chrome-capsule-hover) active:bg-(--chrome-capsule-press)",
        className,
      )}
      {...props}
    />
  );
}
