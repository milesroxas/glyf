import { cn } from "../../shared/lib/utils";

interface KeyCellProps {
  index: number;
  pressed: boolean;
}

export function KeyCell({ index, pressed }: KeyCellProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center rounded-md border text-sm font-medium transition-all duration-75 select-none",
        "bg-background border-input shadow-sm hover:border-accent-foreground/20",
        pressed &&
          "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25 scale-[0.96]",
      )}
    >
      <span>{index}</span>
    </div>
  );
}
