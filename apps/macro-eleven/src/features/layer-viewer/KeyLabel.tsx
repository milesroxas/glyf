import { keycodeToLabel } from "../../shared/lib/keycode-labels";
import { cn } from "../../shared/lib/utils";

interface KeyLabelProps {
  keycode: string;
}

export function KeyLabel({ keycode }: KeyLabelProps) {
  const label = keycodeToLabel(keycode);

  return (
    <div
      className={cn(
        "h-full w-full flex items-center justify-center rounded-md border p-1 text-center text-xs font-medium transition-colors select-none",
        "bg-background border-input text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
      )}
      title={keycode}
    >
      <span className="line-clamp-2 leading-tight">{label}</span>
    </div>
  );
}
