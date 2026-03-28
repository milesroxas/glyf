import { cn } from "../lib/utils";
import type { ConnectionStatus } from "../../entities/device";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { dot: string; badge: string; label: string }
> = {
  connected: {
    dot: "bg-primary shadow-[0_0_6px_var(--color-primary)]",
    badge: "text-primary bg-primary/15",
    label: "Connected",
  },
  connecting: {
    dot: "bg-destructive animate-pulse",
    badge: "text-destructive bg-destructive/15",
    label: "Connecting...",
  },
  disconnected: {
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-muted-foreground/15",
    label: "Disconnected",
  },
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        config.badge
      )}
    >
      <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
