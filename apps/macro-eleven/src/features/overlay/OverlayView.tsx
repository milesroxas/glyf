import { formatMatrixPosition, getAction, layerIds } from "@glyf/keymap-schema";
import { useEffect } from "react";
import { keyFace } from "../../entities/action";
import { type Keymap, layerName } from "../../entities/keymap";
import { useActiveKeymap } from "../../shared/lib/useActiveKeymap";
import { useDeviceStatus } from "../../shared/lib/useDeviceStatus";
import { useInstalledApps } from "../../shared/lib/useInstalledApps";
import { useKeyEvents } from "../../shared/lib/useKeyEvents";
import { usePageVisible } from "../../shared/lib/usePageVisible";
import { usePotValue } from "../../shared/lib/usePotValue";
import { useSettings } from "../../shared/lib/useSettings";
import { cn } from "../../shared/lib/utils";
import { Keycap } from "../../shared/ui/Keycap";
import { KeyLegend } from "../../shared/ui/KeyLegend";
import { KnobDial } from "../../shared/ui/KnobDial";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { useIdleFade } from "./useIdleFade";
import { useOverlayBackdrop } from "./useOverlayBackdrop";

const MAX_POT = 1023;

/**
 * Key size that fits the window below the title bar: 12 px chassis margin at
 * the sides and bottom, 2 px under the title bar. The grid is 4.3 keys wide
 * and 3.2 keys tall (keys plus 0.1-key gaps; pad.css). The window's default
 * and minimum sizes in `commands/overlay.rs` come from the same numbers.
 */
const FIT_KEY = "[--key:min(calc((100cqw-24px)/4.3),calc((100cqh-14px)/3.2))]";

/** One pip per layer; the live one lit. */
function LayerPips({ keymap, layer }: { keymap: Keymap; layer: number }) {
  const ids = layerIds(keymap);
  if (ids.length < 2) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.75">
      {ids.map((id) => (
        <span
          key={id}
          className={cn(
            "size-1 rounded-full bg-foreground/20 transition-colors duration-150",
            id === layer && "bg-primary",
          )}
        />
      ))}
    </span>
  );
}

/**
 * A small always-on-top window: the pad as it is now. It shows what each key
 * does on the live layer, lights keys as you press them, and turns its knob
 * with yours. The window is the pad's chassis, glass or solid; drag it
 * anywhere to move it. Left alone, it fades until the pad is used.
 */
export function OverlayView() {
  const { keys, layer } = useKeyEvents();
  const { keymap, error } = useActiveKeymap();
  const { apps } = useInstalledApps();
  const { value: potValue } = usePotValue();
  const connected = useDeviceStatus() === "connected";
  const { settings } = useSettings();
  const { backdrop, tint } = useOverlayBackdrop(settings?.overlayTransparency);
  const glass = backdrop === "glass";
  const visible = usePageVisible();
  // Knob readings wobble by a count or two; only a real turn is activity
  const activity = `${keys.join()}|${layer}|${Math.round(potValue / 16)}|${visible}`;
  const idle = useIdleFade(
    Boolean(settings?.overlayFadeWhenIdle) && visible,
    activity,
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  const status = error
    ? "Could not load your keymap"
    : connected
      ? null
      : "Not connected";

  return (
    <div
      data-tauri-drag-region
      {...idle}
      style={
        glass
          ? {
              backgroundColor: `color-mix(in oklab, var(--background) ${Math.round(tint * 100)}%, transparent)`,
            }
          : undefined
      }
      className={cn(
        "flex h-screen w-full cursor-default flex-col select-none",
        !glass && "bg-linear-to-b from-card to-background",
      )}
    >
      {/* Title bar: the window buttons sit over its left end */}
      <header
        data-tauri-drag-region
        className="flex h-7 shrink-0 items-center gap-2.5 pr-3 pl-19 text-[11px] leading-none"
      >
        <h1
          className={cn(
            "pointer-events-none min-w-0 flex-1 truncate text-foreground",
            // On glass, a heavier weight keeps the name legible
            glass ? "font-semibold" : "font-medium text-foreground/90",
          )}
        >
          {keymap && layerName(keymap, layer)}
        </h1>
        {status && (
          <span
            role="status"
            className={cn(
              "pointer-events-none shrink-0",
              error
                ? "text-destructive"
                : glass
                  ? "text-foreground/75"
                  : "text-muted-foreground",
            )}
          >
            {status}
          </span>
        )}
        {keymap && connected && <LayerPips keymap={keymap} layer={layer} />}
      </header>

      <div
        data-tauri-drag-region
        className="flex min-h-0 flex-1 items-center justify-center @container-[size]"
      >
        <div
          className={cn(
            "pointer-events-none mt-0.5 mb-3 transition-opacity duration-200",
            FIT_KEY,
            !connected && "opacity-60",
          )}
        >
          <MacropadGrid
            renderKey={(position, index) => {
              const action =
                keymap &&
                getAction(keymap, layer, formatMatrixPosition(position));
              return (
                <Keycap
                  pressed={keys[index] ?? false}
                  empty={Boolean(keymap) && !action}
                  className="h-full w-full overflow-hidden"
                >
                  {keymap && action && (
                    // Keyed by layer: a layer change fades the new legends in
                    <KeyLegend
                      key={layer}
                      face={keyFace(action, keymap, apps)}
                      className="animate-in duration-150 fade-in-0 motion-reduce:animate-none"
                    />
                  )}
                </Keycap>
              );
            }}
            renderEmpty={() => (
              <KnobDial
                value={potValue / MAX_POT}
                ticks={21}
                label="Knob"
                fluid
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
