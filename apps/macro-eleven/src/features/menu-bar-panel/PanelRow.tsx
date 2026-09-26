import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../shared/lib/utils";

/**
 * A menu item in the panel. It highlights under the pointer at once (menus
 * track the pointer exactly) and on keyboard focus; arrow keys move between
 * items (`data-panel-item`).
 */
export function PanelRow({
  children,
  shortcut,
  className,
  ...props
}: ComponentProps<"button"> & {
  /** Key glyphs on the right, as a menu shows them. */
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      data-panel-item
      className={cn(
        "flex h-[26px] w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-[13px] text-foreground outline-none",
        "hover:bg-[var(--glass-hover)] focus-visible:bg-[var(--glass-hover)] active:bg-[var(--glass-press)] disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children}
      {shortcut && (
        <kbd className="ml-auto font-sans text-[12px] tracking-[0.08em] text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export function PanelSeparator() {
  return (
    <hr className="mx-2.5 my-1 border-0 border-t border-[var(--glass-edge)]" />
  );
}

/** A small heading over a group of items. */
export function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-2.5 pt-0.5 pb-0.5 text-[11px] font-semibold text-foreground/55">
      {children}
    </h2>
  );
}
