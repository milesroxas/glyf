import { formatMatrixPosition, getAction } from "@glyf/keymap-schema";
import { useEffect } from "react";
import { actionLabel } from "../../entities/action";
import { layerName } from "../../entities/keymap";
import { useDeviceStatus } from "../../shared/lib/useDeviceStatus";
import { useKeyEvents } from "../../shared/lib/useKeyEvents";
import { usePotValue } from "../../shared/lib/usePotValue";
import { cn } from "../../shared/lib/utils";
import { Badge } from "../../shared/ui/badge";
import { Keycap } from "../../shared/ui/Keycap";
import { KnobDial } from "../../shared/ui/KnobDial";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { Separator } from "../../shared/ui/separator";
import { useActiveKeymap } from "./useActiveKeymap";

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

/** A small always-on-top window showing what each key does on the live layer. */
export function OverlayView() {
  const { keys, layer } = useKeyEvents();
  const { keymap, error } = useActiveKeymap();
  const { value: potValue } = usePotValue();
  const connected = useDeviceStatus() === "connected";

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Macro Eleven
        </h2>
        {keymap && (
          <Badge variant="outline" className="max-w-full truncate">
            {layerName(keymap, layer)}
          </Badge>
        )}
      </div>
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          connected
            ? "bg-primary ring-2 ring-primary/40"
            : "bg-muted-foreground",
        )}
        title={connected ? "Connected" : "Not connected"}
      />
    </div>
  );

  if (!keymap) {
    return (
      <OverlayShell header={header}>
        <div className="flex flex-1 items-center justify-center p-4">
          <p
            className={cn(
              "text-sm",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {error ?? "Loading…"}
          </p>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell header={header}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-3">
        {!connected && (
          <p className="shrink-0 text-xs text-muted-foreground">
            Plug in Macro Eleven to see key feedback
          </p>
        )}
        <div className="flex min-h-0 flex-1">
          <MacropadGrid
            fluid
            renderKey={(position, index) => {
              const action = getAction(
                keymap,
                layer,
                formatMatrixPosition(position),
              );
              return (
                <Keycap
                  pressed={keys[index] ?? false}
                  empty={!action}
                  className="flex h-full w-full items-center justify-center overflow-hidden px-1 py-0.5"
                >
                  <span className="line-clamp-2 w-full text-center text-[10px] leading-tight font-medium break-words">
                    {action ? actionLabel(action, keymap) : ""}
                  </span>
                </Keycap>
              );
            }}
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
