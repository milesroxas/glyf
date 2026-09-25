import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { type ReactNode, useId } from "react";

import { SPRING } from "../lib/motion";
import { cn } from "../lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  /** Names the control for assistive technology. */
  label: string;
  /** The panel for the selected option. */
  children: ReactNode;
  className?: string;
}

/**
 * A macOS-style segmented control. The selected segment's background slides
 * between segments with a spring, starting from wherever it is on screen.
 */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  children,
  className,
}: SegmentedProps<T>) {
  const indicator = useId();
  return (
    <TabsPrimitive.Root
      // Arrow keys move focus; Return or Space picks. Picking can start an
      // editor that takes focus, which must not happen while arrowing past.
      activationMode="manual"
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={className}
    >
      <TabsPrimitive.List
        aria-label={label}
        className="flex h-8 rounded-lg bg-muted p-0.5"
      >
        {options.map((option) => (
          <TabsPrimitive.Trigger
            key={option.value}
            value={option.value}
            className={cn(
              "relative flex-1 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150",
              "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=active]:text-foreground",
            )}
          >
            {option.value === value && (
              <motion.span
                layoutId={indicator}
                transition={SPRING}
                className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-border"
              />
            )}
            <span className="relative">{option.label}</span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      <TabsPrimitive.Content value={value} forceMount className="outline-none">
        {children}
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}

export { Segmented };
