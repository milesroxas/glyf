import { motion } from "motion/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId } from "react";

import { SPRING } from "../lib/motion";
import { cn } from "../lib/utils";

interface SegmentedChoiceProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  /** Names the choice for assistive technology. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A macOS segmented control that picks one value (a radio group), where
 * `Segmented` switches panels. The selection slides between segments with
 * a spring, starting from wherever it is on screen.
 */
function SegmentedChoice<T extends string>({
  value,
  onValueChange,
  options,
  label,
  disabled,
  className,
}: SegmentedChoiceProps<T>) {
  const indicator = useId();
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
      orientation="horizontal"
      className={cn(
        "flex h-7 rounded-lg bg-muted p-0.5 data-[disabled]:opacity-50",
        className,
      )}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "relative flex-1 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150",
            "enabled:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=checked]:text-foreground",
          )}
        >
          {option.value === value && (
            <motion.span
              layoutId={indicator}
              transition={SPRING}
              className="absolute inset-0 rounded-md bg-foreground/[0.16] shadow-sm"
            />
          )}
          <span className="relative">{option.label}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { SegmentedChoice };
