import type * as React from "react";

import { cn } from "../lib/utils";

/** A key cap in text: ⌘, ⇧, a glyph group like "⇧⌘T". */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-medium tracking-wide text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
