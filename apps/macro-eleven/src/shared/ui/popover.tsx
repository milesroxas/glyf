import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";
import { FLOATING_PLACEMENT } from "./floating";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

/** Scales in from its trigger. Scrolls when the window is too short for it. */
function PopoverContent({
  className,
  align = "center",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        {...FLOATING_PLACEMENT}
        className={cn(
          "pop z-50 max-h-(--radix-popover-content-available-height) w-72 overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg outline-hidden [--pop-origin:var(--radix-popover-content-transform-origin)]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
