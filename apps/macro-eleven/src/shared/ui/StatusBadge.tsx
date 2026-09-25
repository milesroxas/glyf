import type { ConnectionStatus } from "../../entities/device";
import { cn } from "../lib/utils";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { dot: string; badge: string; label: string; title: string }
> = {
  connected: {
    dot: "bg-primary shadow-[0_0_6px_var(--color-primary)]",
    badge: "text-primary bg-primary/15",
    label: "Connected",
    title: "Macro Eleven is connected",
  },
  disconnected: {
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-muted-foreground/15",
    label: "Not connected",
    title: "Plug in Macro Eleven over USB. The app connects automatically.",
  },
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        config.badge,
      )}
      title={config.title}
    >
      <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
