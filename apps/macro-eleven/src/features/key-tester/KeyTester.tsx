import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Keyboard,
  Layers,
  PlayCircle,
  Power,
  type LucideIcon,
} from "lucide-react";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { KeyCell } from "./KeyCell";
import { getActionLabel } from "../../entities/action";
import { useKeyEvents } from "../../shared/lib/useKeyEvents";
import {
  onActionError,
  onActionExecuted,
  onKeyEvent,
  onLayerChange,
  onTestModeChange,
  setTestMode,
} from "../../shared/lib/tauri";
import { cn } from "../../shared/lib/utils";

type DebugEventType = "key" | "layer" | "action" | "error" | "mode";

interface DebugEvent {
  id: number;
  type: DebugEventType;
  title: string;
  detail: string;
  timestamp: number;
}

const EVENT_LIMIT = 40;

const EVENT_META: Record<
  DebugEventType,
  { label: string; badgeClass: string; icon: LucideIcon }
> = {
  key: {
    label: "Key State",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Keyboard,
  },
  layer: {
    label: "Layer",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Layers,
  },
  action: {
    label: "Action",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: PlayCircle,
  },
  error: {
    label: "Error",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
  mode: {
    label: "Mode",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Power,
  },
};

function indexToMatrixLabel(index: number): string {
  if (index <= 2) {
    return `R0C${index}`;
  }
  if (index <= 6) {
    return `R1C${index - 3}`;
  }
  return `R2C${index - 7}`;
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function KeyTester() {
  const { keys, layer, hostLayer, firmwareLayer, passthrough } = useKeyEvents();
  const [hostMode, setHostMode] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const eventCounter = useRef(0);
  const lastKeySignatureRef = useRef("");

  const pushEvent = useCallback((event: Omit<DebugEvent, "id">) => {
    setDebugEvents((current) => {
      eventCounter.current += 1;
      const next: DebugEvent = {
        ...event,
        id: eventCounter.current,
      };
      return [next, ...current].slice(0, EVENT_LIMIT);
    });
  }, []);

  useEffect(() => {
    setHostMode(passthrough);
  }, [passthrough]);

  useEffect(() => {
    const promise = onActionError((event) => {
      setActionError(event.error);
      pushEvent({
        type: "error",
        title: "Action Failed",
        detail: event.error,
        timestamp: Date.now(),
      });
    });
    return () => {
      promise.then((fn) => fn());
    };
  }, [pushEvent]);

  useEffect(() => {
    const listeners = [
      onActionExecuted((event) => {
        pushEvent({
          type: "action",
          title: getActionLabel(event.action),
          detail: `Layer ${event.layer} • r${event.position.row}c${event.position.col}`,
          timestamp: Date.now(),
        });
      }),
      onLayerChange((event) => {
        pushEvent({
          type: "layer",
          title: `Switched to layer ${event.layer}`,
          detail: event.triggerApp
            ? `Active app: ${event.triggerApp}`
            : "Manual override / action",
          timestamp: Date.now(),
        });
      }),
      onTestModeChange((enabled) => {
        pushEvent({
          type: "mode",
          title: `Host keymap ${enabled ? "enabled" : "disabled"}`,
          detail: enabled
            ? "Host actions will use macOS automation"
            : "Firmware macros will run directly",
          timestamp: Date.now(),
        });
      }),
      onKeyEvent((event) => {
        const signature = event.keys.map((pressed) => (pressed ? "1" : "0")).join("");
        if (signature === lastKeySignatureRef.current) {
          return;
        }
        lastKeySignatureRef.current = signature;
        const pressed = event.keys
          .map((pressed, index) => (pressed ? index : null))
          .filter((value): value is number => value !== null);
        pushEvent({
          type: "key",
          title: `Matrix update • layer ${event.layer}`,
          detail: pressed.length
            ? pressed
                .map((index) => `${indexToMatrixLabel(index)} (#${index})`)
                .join(", ")
            : "All keys released",
          timestamp: Date.now(),
        });
      }),
    ];

    return () => {
      listeners.forEach((promise) => {
        promise.then((fn) => fn());
      });
    };
  }, [pushEvent]);

  const handleToggleHostMode = async () => {
    const newState = !hostMode;
    setHostMode(newState);
    try {
      await setTestMode(newState);
    } catch (error) {
      console.error("Failed to set test mode:", error);
      setHostMode(!newState);
    }
  };

  const handleClearEvents = () => {
    setDebugEvents([]);
    lastKeySignatureRef.current = "";
  };

  const pressedCount = keys.filter(Boolean).length;
  const pressedLabels = keys
    .map((pressed, index) => (pressed ? index : null))
    .filter((value): value is number => value !== null)
    .map((index) => `${indexToMatrixLabel(index)} (#${index})`);
  const activeKeySummary = pressedLabels.length ? pressedLabels.join(", ") : "None";
  const hostLayerDisplay = hostLayer ?? "—";
  const debugStats = [
    { label: "Firmware Layer", value: firmwareLayer },
    { label: "Host Layer", value: hostLayerDisplay },
    {
      label: "Host Keymap",
      value: hostMode ? "Enabled" : "Disabled",
      sublabel: hostMode ? "macOS runtime active" : "Firmware passthrough",
    },
    { label: "Keys Held", value: pressedCount, sublabel: activeKeySummary },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Key Tester</h2>
          <p className="text-sm text-muted-foreground">
            Visualize key presses and test layer switching.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm shadow-sm">
                <span className="text-muted-foreground">Current Layer:</span>
                <span className="font-mono font-medium">{layer}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Host keymap mode
            </span>
            <button
                role="switch"
                aria-checked={hostMode}
                onClick={handleToggleHostMode}
                className={cn(
                "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                hostMode ? "bg-primary" : "bg-input"
                )}
            >
                <span
                className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    hostMode ? "translate-x-4" : "translate-x-0"
                )}
                />
            </button>
            </label>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="space-y-3 p-4 border-b bg-muted/20">
          {!hostMode && (
            <div className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Host keymap mode is off. Turn it on to run app-specific launchers and shortcuts from
              <code className="mx-1 font-mono text-xs">user-custom.json</code>.
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start justify-between gap-3">
              <span>{actionError}</span>
              <button
                className="text-xs font-medium underline underline-offset-4"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="p-10 flex justify-center bg-muted/20">
            <MacropadGrid
                renderKey={(index) => (
                <KeyCell index={index} pressed={keys[index] ?? false} />
                )}
            />
        </div>
        <div className="flex items-center p-4 border-t bg-muted/40">
            <p className="text-xs text-muted-foreground">
                {hostMode 
                    ? "Host keymap is active. App launches and shortcuts come from your JSON config." 
                    : "Host keymap is disabled. Firmware macros run directly from the device."}
            </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Host Debug Console</h3>
            <p className="text-sm text-muted-foreground">
              Inspect HID state, layer changes, and host-side actions.
            </p>
          </div>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={handleClearEvents}
          >
            Clear Feed
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {debugStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-background/60 p-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold">{stat.value}</p>
              {stat.sublabel && (
                <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
              )}
            </div>
          ))}
        </div>
        <div className="border-t">
          {debugEvents.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Interact with the macropad to populate the event feed.
            </p>
          ) : (
            <div className="divide-y">
              {debugEvents.map((event) => {
                const meta = EVENT_META[event.type];
                const Icon = meta.icon;
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                        meta.badgeClass
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium leading-tight">{event.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
