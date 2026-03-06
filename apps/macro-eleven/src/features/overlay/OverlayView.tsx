import { useEffect, useState } from "react";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { KnobDial } from "../../shared/ui/KnobDial";
import { Badge } from "../../shared/ui/badge";
import { Separator } from "../../shared/ui/separator";
import { keycodeToLabel } from "../../shared/lib/keycode-labels";
import { useKeyEvents } from "../../shared/lib/useKeyEvents";
import { useLayerData } from "../../shared/lib/useLayerData";
import { getKeyForDisplay } from "../../entities/layer";
import { usePotValue } from "../../shared/lib/usePotValue";
import { onDeviceStatus } from "../../shared/lib/tauri";
import { cn } from "../../shared/lib/utils";
import "./OverlayKeyCell.css";

function OverlayKeyCell({
  keycode,
  pressed,
}: {
  keycode: string;
  pressed: boolean;
}) {
  const label = keycodeToLabel(keycode);
  return (
    <div
      className={cn(
        "overlay-key-cell flex h-full w-full items-center justify-center overflow-hidden rounded-lg px-1 py-0.5 transition-all duration-100",
        "text-foreground",
        pressed && "text-primary"
      )}
      title={keycode}
      data-pressed={pressed}
    >
      <span className="w-full text-center text-[10px] font-medium leading-tight wrap-break-word line-clamp-2">
        {label}
      </span>
    </div>
  );
}

function OverlayShell({
  children,
  header,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="dark flex min-h-screen w-full flex-col bg-background">
      <header className="shrink-0 px-5 py-3">{header}</header>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function OverlayView() {
  const { keys, layer } = useKeyEvents();
  const { layers, loading, error } = useLayerData();
  const { value: potValue } = usePotValue();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unlisten = onDeviceStatus((event) => {
      setConnected(event.connected);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const currentLayer = layers.find((l) => l.index === layer) ?? layers[0];

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Macro Eleven
        </h2>
        {!loading && !error && layers.length > 0 && (
          <Badge variant="outline">
            L{layer} · {currentLayer.name}
          </Badge>
        )}
      </div>
      {!loading && !error && layers.length > 0 && (
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            connected
              ? "bg-chart-2 ring-2 ring-chart-2/50"
              : "bg-muted-foreground"
          )}
          title={connected ? "Connected" : "Disconnected"}
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <OverlayShell header={header}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </OverlayShell>
    );
  }

  if (error || layers.length === 0) {
    return (
      <OverlayShell header={header}>
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-sm text-destructive">{error ?? "No layers"}</p>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell header={header}>
      <div className="flex flex-1 min-h-0 flex-col gap-2 px-5 py-3">
        {!connected && (
          <p className="text-xs text-muted-foreground shrink-0">
            Connect device to see key feedback
          </p>
        )}
        <div className="flex flex-1 min-h-0">
          <MacropadGrid
            fluid
            renderKey={(index) => (
              <OverlayKeyCell
                keycode={getKeyForDisplay(currentLayer.keys, index)}
                pressed={keys[index] ?? false}
              />
            )}
            renderEmpty={() => (
              <KnobDial
                value={potValue / 1023}
                ticks={31}
                label="Potentiometer"
                fluid
              />
            )}
          />
        </div>
      </div>
    </OverlayShell>
  );
}
