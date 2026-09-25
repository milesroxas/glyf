import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";
import "./keycap.css";

interface KeycapProps extends React.ComponentProps<"div"> {
  /** Render the child element (a button) with keycap styling. */
  asChild?: boolean;
  /** The physical key is held down. */
  pressed?: boolean;
  /** No action: dashed outline. */
  empty?: boolean;
  /** Shrinks under the pointer on press. */
  interactive?: boolean;
  dropTarget?: boolean;
}

function Keycap({
  asChild,
  pressed,
  empty,
  interactive,
  dropTarget,
  className,
  ...props
}: KeycapProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-pressed={pressed || undefined}
      data-empty={empty || undefined}
      data-interactive={interactive || undefined}
      data-drop-target={dropTarget || undefined}
      className={cn("keycap", className)}
      {...props}
    />
  );
}

export { Keycap };
