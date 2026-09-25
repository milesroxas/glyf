import {
  deleteLayer,
  duplicateLayer,
  renameLayer,
  setLayerTrigger,
} from "@glyf/keymap-schema";
import { ChevronsUpDown, Copy, Settings2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { findApp } from "../../../entities/app";
import { layerName } from "../../../entities/keymap";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../shared/ui/popover";
import { Tooltip } from "../../../shared/ui/tooltip";
import { AppIcon } from "../apps/AppIcon";
import { AppPicker } from "../apps/AppPicker";
import { useInstalledApps } from "../apps/useInstalledApps";
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
export function LayerSettings() {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="Layer settings">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Settings for ${layerName(keymap, layer)}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-accent data-[state=open]:text-foreground"
          >
            <Settings2 className="size-4" />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="grid w-80 gap-4">
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
        <LayerActions onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
