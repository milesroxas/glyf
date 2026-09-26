import { formatMatrixPosition, getAction, layerIds } from "@glyf/keymap-schema";
import { keyFace } from "../../entities/action";
import type { InstalledApp } from "../../entities/app";
import { type Keymap, layerName } from "../../entities/keymap";
import { cn } from "../../shared/lib/utils";
import { Keycap } from "../../shared/ui/Keycap";
import { KeyLegend } from "../../shared/ui/KeyLegend";
import { KnobDial } from "../../shared/ui/KnobDial";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";

const MAX_POT = 1023;

/**
 * Keys fill the module's width (4.3 keys with gaps), up to 60 px: the
 * smallest key that keeps an eight-letter label on one line (pad.css).
 */
const FIT_KEY = "[--key:min(calc((100cqw-2px)/4.3),60px)]";

interface PadModuleProps {
  keymap: Keymap | null;
  error: string | null;
  layer: number;
  keys: boolean[];
  potValue: number;
  connected: boolean;
  apps: readonly InstalledApp[] | null;
}

/**
 * The pad at a glance: the live layer's keys as the designer draws them,
 * lit as you press them, the knob turning with yours, and which layer this
 * is. Dimmed, with a hint, while the pad is unplugged.
 */
export function PadModule({
  keymap,
  error,
  layer,
  keys,
  potValue,
  connected,
  apps,
}: PadModuleProps) {
  const ids = keymap ? layerIds(keymap) : [];
  return (
    <section
      aria-label="Your pad"
      className="rounded-[14px] bg-[var(--glass-well)] px-3 pt-3 pb-2.5 shadow-[inset_0_0_0_1px_var(--glass-edge)]"
    >
      <div className="@container flex justify-center">
        <div
          className={cn(
            "pointer-events-none transition-opacity duration-200",
            FIT_KEY,
            !connected && "opacity-45",
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

      <footer className="mt-2 flex h-4 items-center gap-2 px-0.5 text-[12px] leading-none">
        {error ? (
          <span role="status" className="truncate text-destructive">
            Could not load your keymap
          </span>
        ) : connected ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {keymap ? layerName(keymap, layer) : ""}
            </span>
            {ids.length > 1 && (
              <span
                role="img"
                aria-label={`Layer ${ids.indexOf(layer) + 1} of ${ids.length}`}
                className="flex shrink-0 items-center gap-1"
              >
                {ids.map((id) => (
                  <span
                    key={id}
                    className={cn(
                      "size-1.5 rounded-full bg-foreground/25 transition-colors duration-150",
                      id === layer && "bg-primary",
                    )}
                  />
                ))}
              </span>
            )}
          </>
        ) : (
          <span role="status" className="truncate text-muted-foreground">
            Plug in Macro Eleven. It connects on its own.
          </span>
        )}
      </footer>
    </section>
  );
}
