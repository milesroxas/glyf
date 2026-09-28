import { Check, ChevronDown, Redo2, TriangleAlert, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { findApp } from "../../entities/app";
import { layerName } from "../../entities/keymap";
import { FADE, LABEL_SWAP, POP } from "../../shared/lib/motion";
import { useInstalledApps } from "../../shared/lib/useInstalledApps";
import { cn } from "../../shared/lib/utils";
import { Kbd } from "../../shared/ui/kbd";
import { ToolbarButton, ToolbarGroup } from "../../shared/ui/toolbar";
import { Tooltip } from "../../shared/ui/tooltip";
import { useLayerSettings } from "./layers/LayerSettings";
import { useDesigner, useKeymap } from "./model/KeymapProvider";

/** How long "Saved" stays after a save. */
const SAVED_VISIBLE_MS = 1200;

/** "Saved" after each autosave, then it fades; a failed save stays. */
function SaveStatus() {
  const { save, retrySave } = useDesigner();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // A failed save also stays in a toast until it is retried or dismissed
  useEffect(() => {
    if (save.status !== "error") return;
    const id = toast.error("Could not save your changes", {
      description: save.message,
      duration: Number.POSITIVE_INFINITY,
      action: { label: "Retry", onClick: retrySave },
    });
    return () => void toast.dismiss(id);
  }, [save, retrySave]);

  useEffect(() => {
    if (save.status !== "saved") return;
    setSavedAt(save.at);
    const timer = setTimeout(() => setSavedAt(null), SAVED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [save]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-20 justify-end text-xs"
    >
      <AnimatePresence mode="wait" initial={false}>
        {save.status === "error" ? (
          <motion.button
            key="error"
            type="button"
            onClick={retrySave}
            {...FADE}
            className="flex items-center gap-1 rounded px-1 text-destructive hover:underline"
          >
            <TriangleAlert className="size-3.5" />
            Not saved. Retry
          </motion.button>
        ) : (
          savedAt !== null && (
            <motion.span
              key="saved"
              {...FADE}
              // "Saved" lingers on its way out
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="flex items-center gap-1 text-muted-foreground"
            >
              <Check className="size-3.5" />
              Saved
            </motion.span>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

/** A shortcut after a tooltip's text. */
function TooltipKeys({ children }: { children: ReactNode }) {
  return (
    <Kbd className="ml-1 h-4 border-0 bg-background/20 text-background">
      {children}
    </Kbd>
  );
}

function HistoryButtons() {
  const { undo, redo, canUndo, canRedo } = useDesigner();
  return (
    <ToolbarGroup>
      <Tooltip
        side="bottom"
        content={
          <>
            Undo <TooltipKeys>⌘Z</TooltipKeys>
          </>
        }
      >
        <ToolbarButton
          aria-label="Undo"
          aria-disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 strokeWidth={1.9} />
        </ToolbarButton>
      </Tooltip>
      <Tooltip
        side="bottom"
        content={
          <>
            Redo <TooltipKeys>⇧⌘Z</TooltipKeys>
          </>
        }
      >
        <ToolbarButton
          aria-label="Redo"
          aria-disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 strokeWidth={1.9} />
        </ToolbarButton>
      </Tooltip>
    </ToolbarGroup>
  );
}

/** The designer's end of the toolbar: save status, then undo and redo. */
export function DesignerActions() {
  return (
    <>
      <SaveStatus />
      <HistoryButtons />
    </>
  );
}

/**
 * How the pad gets to this layer, and whether it is there now. The pad
 * changing layer on its own (an app came to the front) cross-fades the
 * line; moving to another layer here swaps it at once.
 */
function LayerSubtitle() {
  const keymap = useKeymap();
  const { layer, device } = useDesigner();
  const { apps } = useInstalledApps();
  const trigger = keymap.layers[layer]?.triggerApp;
  const live = device.hostLayer === layer;
  const reached =
    layer === 0
      ? "Base layer"
      : trigger
        ? `With ${(apps && findApp(apps, trigger)?.name) ?? trigger} in front`
        : "No trigger app";
  const text = live ? `${reached} · Live on the pad` : reached;

  return (
    <p
      data-tauri-drag-region
      className="relative flex h-3.5 min-w-0 items-center gap-[5px] text-[11px] leading-[14px] text-muted-foreground"
    >
      {/* Keyed by layer: a new layer starts without animating */}
      <AnimatePresence key={layer} initial={false} mode="popLayout">
        {live && (
          <motion.span
            key="live"
            {...POP}
            className="size-1.5 shrink-0 rounded-full bg-primary"
          />
        )}
        <motion.span
          key={text}
          data-tauri-drag-region
          {...LABEL_SWAP}
          className="truncate"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}

/**
 * The layer on screen, as the window's title. Clicking it opens the layer's
 * settings (name, trigger app, duplicate, delete) under the title and its
 * subtitle.
 */
export function DesignerTitle() {
  const keymap = useKeymap();
  const { layer } = useDesigner();
  const settings = useLayerSettings();
  const open = settings.openFor === layer;
  const block = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={block}
      data-tauri-drag-region
      className="flex min-w-0 flex-col gap-px"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() =>
          block.current && settings.toggle(layer, block.current, "bottom")
        }
        className="-mx-1.5 flex min-w-0 items-center gap-1 self-start rounded-md px-1.5 text-[15px] leading-[19px] font-semibold tracking-[-0.01em] outline-none transition-colors duration-150 hover:bg-(--glass-hover) focus-visible:ring-2 focus-visible:ring-ring/60 aria-expanded:bg-(--glass-hover)"
      >
        <span className="truncate">{layerName(keymap, layer)}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={2.25}
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <LayerSubtitle />
    </div>
  );
}
