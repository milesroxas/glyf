import {
  deleteLayer,
  duplicateLayer,
  renameLayer,
  setLayerTrigger,
} from "@glyf/keymap-schema";
import { ChevronsUpDown, Copy, Trash2, X } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { findApp } from "../../../entities/app";
import { layerName } from "../../../entities/keymap";
import { useInstalledApps } from "../../../shared/lib/useInstalledApps";
import { AppIcon } from "../../../shared/ui/AppIcon";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../shared/ui/popover";
import { AppPicker } from "../apps/AppPicker";
import { Field } from "../editors/Field";
import { useDesigner, useKeymap } from "../model/KeymapProvider";

function pluralKeys(count: number) {
  return count === 1 ? "1 key" : `${count} keys`;
}

/** The app whose coming to the front switches to this layer. */
function TriggerAppField() {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();
  const { apps } = useInstalledApps();
  const trigger = keymap.layers[layer]?.triggerApp;
  const app = trigger && apps ? findApp(apps, trigger) : undefined;

  return (
    <Field label="Switch to this layer when this app is in front">
      <div className="flex items-center gap-1.5">
        <AppPicker
          onSelect={(picked) =>
            edit((km) => setLayerTrigger(km, layer, picked.bundleId))
          }
        >
          <button
            type="button"
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-input/30 px-2.5 text-left text-sm shadow-xs outline-none hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            {trigger ? (
              <>
                <AppIcon app={app} className="size-4" />
                <span className="truncate">{app?.name ?? trigger}</span>
              </>
            ) : (
              <span className="flex-1 text-muted-foreground">No app</span>
            )}
            <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </AppPicker>
        {trigger && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove the app"
            onClick={() => edit((km) => setLayerTrigger(km, layer, undefined))}
          >
            <X />
          </Button>
        )}
      </div>
    </Field>
  );
}

/** Duplicate and delete. Deleting offers Undo instead of asking first. */
function LayerActions({ onDone }: { onDone: () => void }) {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();
  const name = layerName(keymap, layer);

  const duplicate = () => {
    onDone();
    edit((km) => {
      const copy = duplicateLayer(km, layer, `${name} copy`);
      return { keymap: copy.keymap, focus: { layer: copy.layer } };
    });
  };

  const remove = () => {
    onDone();
    edit((km) => {
      const { keymap: next, cleared } = deleteLayer(km, layer);
      const note = cleared.length
        ? ` ${pluralKeys(cleared.length)} that switched to it now do nothing.`
        : "";
      return {
        keymap: next,
        focus: { layer: 0, selected: null },
        undoToast: `Deleted “${name}”.${note}`,
      };
    });
  };

  return (
    <div className="flex gap-2 border-t pt-3">
      <Button variant="ghost" size="sm" onClick={duplicate}>
        <Copy />
        Duplicate
      </Button>
      {layer !== 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={remove}
        >
          <Trash2 />
          Delete layer
        </Button>
      )}
    </div>
  );
}

/** Name, trigger app, duplicate, and delete for the layer being viewed. */
function LayerSettingsContent({
  onClose,
  ...props
}: ComponentProps<typeof PopoverContent> & { onClose: () => void }) {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();

  return (
    <PopoverContent
      align="start"
      aria-label={`Settings for ${layerName(keymap, layer)}`}
      className="grid w-80 gap-4"
      {...props}
    >
      <Field label="Layer name" htmlFor="layer-name">
        <Input
          id="layer-name"
          value={keymap.layers[layer]?.name ?? ""}
          placeholder={`Layer ${layer}`}
          onChange={(event) => {
            // Read now: the edit may run later (after duplicating Default)
            const name = event.target.value;
            edit((km) => renameLayer(km, layer, name), {
              coalesce: `layer-name:${layer}`,
            });
          }}
        />
      </Field>
      <TriggerAppField />
      <LayerActions onDone={onClose} />
    </PopoverContent>
  );
}

/** Where the settings open: beside a sidebar row, or under the title. */
type Side = "right" | "bottom";

interface Anchor {
  layer: number;
  element: HTMLElement;
  side: Side;
}

interface LayerSettingsValue {
  /** The layer whose settings are showing, if any. */
  openFor: number | null;
  /** Open a layer's settings next to `element`, or close them if open there. */
  toggle: (layer: number, element: HTMLElement, side: Side) => void;
  open: (layer: number, element: HTMLElement, side: Side) => void;
  close: () => void;
}

const LayerSettingsContext = createContext<LayerSettingsValue | null>(null);

export function useLayerSettings(): LayerSettingsValue {
  const context = useContext(LayerSettingsContext);
  if (!context) {
    throw new Error(
      "useLayerSettings must be used inside LayerSettingsProvider",
    );
  }
  return context;
}

/**
 * One settings popover for the layer on screen, opened from its sidebar row
 * (right-click, double-click, Return) or from the title in the toolbar. It
 * closes when the view moves to another layer, and gives focus back to what
 * opened it unless a click elsewhere closed it.
 */
export function LayerSettingsProvider({ children }: { children: ReactNode }) {
  const { keymap, layer } = useDesigner();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const isOpen = anchor !== null && anchor.layer === layer;
  // Kept after closing: the exit animation stays in place, and focus goes back
  const anchorRef = useRef<HTMLElement | null>(null);
  if (anchor) anchorRef.current = anchor.element;
  // A click or focus elsewhere closed the settings: leave focus there
  const dismissedOutside = useRef(false);

  // Settings belong to one layer; moving off it forgets them
  useEffect(() => {
    setAnchor((current) =>
      current && current.layer !== layer ? null : current,
    );
  }, [layer]);

  const open = (id: number, element: HTMLElement, side: Side) => {
    dismissedOutside.current = false;
    setAnchor({ layer: id, element, side });
  };
  const value: LayerSettingsValue = {
    openFor: isOpen ? anchor.layer : null,
    open,
    close: () => setAnchor(null),
    toggle: (id, element, side) =>
      isOpen && anchor.element === element
        ? setAnchor(null)
        : open(id, element, side),
  };

  return (
    <LayerSettingsContext.Provider value={value}>
      {children}
      <Popover open={isOpen} onOpenChange={(next) => !next && setAnchor(null)}>
        <PopoverAnchor virtualRef={anchorRef as RefObject<HTMLElement>} />
        {keymap && (
          <LayerSettingsContent
            side={anchor?.side ?? "bottom"}
            // Beside a row, clear the sidebar's glass edge
            sideOffset={anchor?.side === "right" ? 18 : 6}
            onClose={() => setAnchor(null)}
            onInteractOutside={(event) => {
              // What opened the settings opens and closes them itself
              const target = event.target as Node | null;
              if (target && anchor?.element.contains(target)) {
                event.preventDefault();
              } else {
                dismissedOutside.current = true;
              }
            }}
            onCloseAutoFocus={(event) => {
              // Back to what opened them, as a trigger would; there is none
              event.preventDefault();
              const anchor = anchorRef.current;
              if (!anchor || dismissedOutside.current) return;
              const target = anchor.matches("button")
                ? anchor
                : anchor.querySelector("button");
              target?.focus({ preventScroll: true });
            }}
          />
        )}
      </Popover>
    </LayerSettingsContext.Provider>
  );
}
