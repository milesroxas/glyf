/**
 * Source-list parts for the glass sidebar: sections with a heading that
 * collapses them, and rows with an icon, a label, and trailing marks in
 * fixed lanes. Selection moves at once, as in a Mac sidebar: it follows
 * clicks and ⌘-number shortcuts dozens of times a day.
 */
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { SPRING } from "../lib/motion";
import { useStoredState } from "../lib/storage";
import { cn } from "../lib/utils";

/** Classes for a sidebar row, on whatever element it is (button, link). */
export function sidebarItem(selected = false) {
  return cn(
    "flex h-7 w-full items-center gap-2 rounded-[7px] pr-2 pl-2.5 text-left text-[13px] leading-[18px] text-foreground outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-ring/60",
    selected ? "bg-(--chrome-selection)" : "hover:bg-(--chrome-hover)",
  );
}

/** The row's icon lane: 16 px, so labels line up whatever the icon. */
export function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-foreground/75 [&>svg]:size-[15px]">
      {children}
    </span>
  );
}

export function SidebarLabel({ children }: { children: ReactNode }) {
  return <span className="min-w-0 flex-1 truncate">{children}</span>;
}

/**
 * Classes for a well: the tile that names the profile at the sidebar's top
 * and the pad at its foot. Its glyph lines up with the rows' icons, its
 * trailing mark with their shortcuts.
 */
export const SIDEBAR_WELL =
  "flex h-12 w-full shrink-0 items-center gap-2.5 rounded-[10px] bg-(--chrome-well) pr-2 pl-2.5 text-left";

/** A well's two lines: its name, and a detail line under it. */
export function SidebarWellText({
  title,
  className,
  ...props
}: { title: ReactNode } & ComponentProps<"span">) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-px">
      <span className="truncate text-[13px] leading-[17px] font-semibold">
        {title}
      </span>
      <span
        className={cn(
          "flex items-center gap-1 text-[11px] leading-[14px] text-foreground/60",
          className,
        )}
        {...props}
      />
    </span>
  );
}

/** A short word or number at the end of a row (Update, 42%). */
export function SidebarBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex h-[18px] shrink-0 items-center rounded-full bg-(--chrome-selection) px-[7px] text-[11px] font-medium text-foreground/85 tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A titled group of rows. Clicking the title collapses it; the chevron shows
 * on hover, and stays while collapsed so the way back is visible. The choice
 * is remembered per section.
 */
export function SidebarSection({
  id,
  title,
  action,
  className,
  children,
}: {
  /** Remembers the collapsed state under this name. */
  id: string;
  title: string;
  /** A small button at the heading's end (add). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useStoredState(
    `sidebar.${id}.collapsed`,
    false,
  );
  const body = useId();

  return (
    <section aria-label={title} className={cn("group/section", className)}>
      <div className="flex h-[22px] items-center pr-1.5 pl-2.5">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={body}
          onClick={() => setCollapsed(!collapsed)}
          className="flex min-w-0 flex-1 items-center gap-1 self-stretch text-left text-[11px] font-semibold text-foreground/50 outline-none transition-colors duration-150 hover:text-foreground/70 focus-visible:text-foreground/80"
        >
          {title}
          <ChevronRight
            aria-hidden
            strokeWidth={2.5}
            className={cn(
              "size-3 transition-[opacity,rotate] duration-200 ease-(--ease-out) motion-reduce:transition-none",
              collapsed
                ? "opacity-100"
                : "rotate-90 opacity-0 group-focus-within/section:opacity-100 group-hover/section:opacity-100",
            )}
          />
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            id={body}
            // Clipped only while it moves, so focus rings and a dragged
            // row's shadow show once it settles
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{
              height: "auto",
              opacity: 1,
              overflow: "hidden",
              transitionEnd: { overflow: "visible" },
            }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={SPRING}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** The small icon button at a section heading's end. */
export function SidebarAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-5 items-center justify-center rounded-md text-foreground/50 outline-none transition-[color,background-color,scale] duration-150 ease-(--ease-out) hover:bg-(--chrome-hover) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.92] [&>svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
