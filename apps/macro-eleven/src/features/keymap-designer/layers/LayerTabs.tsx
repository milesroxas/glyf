import { addLayer, layerIds, moveLayer } from "@glyf/keymap-schema";
import { ChevronDown, Plus } from "lucide-react";
import { motion, Reorder } from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useRef,
  useState,
} from "react";
import { layerName } from "../../../entities/keymap";
import { CROSSFADE, SPRING } from "../../../shared/lib/motion";
import { useScrollEdges } from "../../../shared/lib/useScrollEdges";
import { cn } from "../../../shared/lib/utils";
import { Popover, PopoverAnchor } from "../../../shared/ui/popover";
import { Tooltip } from "../../../shared/ui/tooltip";
import { useDesigner, useKeymap } from "../model/KeymapProvider";
import { LayerSettingsContent } from "./LayerSettings";

/** The settings chevron inside the active tab. */
const SETTINGS_CHEVRON = "[data-layer-settings]";

function onChevron(event: MouseEvent) {
  return (event.target as Element).closest(SETTINGS_CHEVRON) !== null;
}

function LayerTab({
  id,
  active,
  live,
  settingsOpen,
  tabRef,
  onSelect,
  onSettings,
  onKeyDown,
}: {
  id: number;
  active: boolean;
  /** The layer the pad is on right now. */
  live: boolean;
  /** This tab's settings popover is showing. */
  settingsOpen: boolean;
  tabRef?: RefObject<HTMLButtonElement | null>;
  onSelect: () => void;
  onSettings: (open: boolean) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const keymap = useKeymap();
  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      data-layer={id}
      aria-selected={active}
      aria-haspopup={active ? "dialog" : undefined}
      aria-expanded={active ? settingsOpen : undefined}
      tabIndex={active ? 0 : -1}
      // Select on press, so dragging a tab also brings it forward
      onPointerDown={onSelect}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      // The chevron opens and closes the settings; the rest of the tab closes them
      onClick={(event) => {
        if (onChevron(event)) onSettings(!settingsOpen);
        else if (settingsOpen) onSettings(false);
      }}
      onDoubleClick={(event) => !onChevron(event) && onSettings(true)}
      onContextMenu={(event) => {
        event.preventDefault();
        onSettings(true);
      }}
      className={cn(
        "relative flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring/60",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {active && (
        // Translucent, so the labels it passes over stay readable in flight
        <motion.span
          layoutId="active-layer"
          transition={SPRING}
          className="absolute inset-0 rounded-md bg-foreground/15 shadow-sm ring-1 ring-border"
        />
      )}
      <span className="relative">{layerName(keymap, id)}</span>
      {live && (
        <Tooltip content="Macro Eleven is on this layer">
          <span className="relative size-1.5 rounded-full bg-primary" />
        </Tooltip>
      )}
      {active && (
        <Tooltip content="Layer settings">
          <motion.span
            data-layer-settings
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={CROSSFADE}
            className="relative -mr-1.5 flex h-7 w-4 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
                settingsOpen && "rotate-180",
              )}
            />
          </motion.span>
        </Tooltip>
      )}
    </button>
  );
}

/**
 * The keymap's layers as tabs. Layer 0 stays first; drag the others, or
 * press ⌥← / ⌥→, to reorder. ⌘1–⌘9 switch layers from anywhere in the
 * designer. A layer's settings open under its tab: from the chevron on the
 * active tab, a right-click or double-click on any tab, or Return, Space,
 * or ⇧F10 on the focused tab.
 */
export function LayerTabs() {
  const keymap = useKeymap();
  const { layer, setLayer, edit, device } = useDesigner();
  const ids = layerIds(keymap);
  const movable = ids.filter((id) => id !== 0);
  const [dragOrder, setDragOrder] = useState<number[] | null>(null);
  const order = dragOrder ?? movable;
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const edges = useScrollEdges(list);

  // Settings belong to one layer, so they close when the view moves off it
  const [settingsFor, setSettingsFor] = useState<number | null>(null);
  const settingsOpen = settingsFor === layer;
  const activeTab = useRef<HTMLButtonElement>(null);
  // A click or focus elsewhere closed the settings: leave focus there
  const dismissedOutside = useRef(false);

  const showSettings = (id: number, open: boolean) => {
    dismissedOutside.current = false;
    setSettingsFor(open ? id : null);
  };

  const focusTab = (id: number) =>
    list?.querySelector<HTMLButtonElement>(`[data-layer="${id}"]`)?.focus();

  /**
   * Apply a new tab order. Layer IDs are renumbered to follow it (IDs are
   * reused in ascending order), and the view stays on the same layer.
   */
  const reorder = (next: number[], moved: number) => {
    if (next.every((value, i) => value === movable[i])) return;
    const viewing = layer === 0 ? 0 : movable[next.indexOf(layer)];
    edit((current) => ({
      keymap: moveLayer(current, moved, next.indexOf(moved)),
      focus: { layer: viewing },
    }));
    return viewing;
  };

  const commitDrag = (moved: number) => {
    const next = dragOrder;
    setDragOrder(null);
    if (next) reorder(next, moved);
  };

  // Arrows move between tabs; ⌥ with an arrow moves the tab itself
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const opensSettings =
      ["Enter", " ", "ContextMenu"].includes(event.key) ||
      (event.key === "F10" && event.shiftKey);
    if (opensSettings) {
      event.preventDefault();
      showSettings(layer, true);
      return;
    }
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    if (event.altKey) {
      const at = movable.indexOf(layer);
      const to = at + step;
      if (at === -1 || to < 0 || to >= movable.length) return;
      const next = movable.filter((id) => id !== layer);
      next.splice(to, 0, layer);
      const viewing = reorder(next, layer);
      if (viewing !== undefined) {
        requestAnimationFrame(() => focusTab(viewing));
      }
      return;
    }
    const all = [0, ...order];
    const at = all.indexOf(layer);
    focusTab(all[Math.min(Math.max(at + step, 0), all.length - 1)]);
  };

  const add = () =>
    edit((current) => {
      const { keymap: next, layer: id } = addLayer(
        current,
        `Layer ${layerIds(current).length}`,
      );
      return { keymap: next, focus: { layer: id, selected: null } };
    });

  const tab = (id: number) => (
    <LayerTab
      id={id}
      active={layer === id}
      live={device.hostLayer === id}
      settingsOpen={settingsOpen && layer === id}
      tabRef={layer === id ? activeTab : undefined}
      onSelect={() => setLayer(id)}
      onSettings={(open) => showSettings(id, open)}
      onKeyDown={onKeyDown}
    />
  );

  // Fade the edge where more tabs are scrolled out of view
  const fade = [
    edges.left && "transparent, black 24px",
    edges.right && "black calc(100% - 24px), transparent",
  ].filter(Boolean);
  const mask = `linear-gradient(to right, ${fade.join(", ")})`;

  return (
    <Popover
      open={settingsOpen}
      onOpenChange={(open) => !open && setSettingsFor(null)}
    >
      <PopoverAnchor virtualRef={activeTab as RefObject<HTMLButtonElement>} />
      <div className="flex min-w-0 items-center gap-1">
        <div
          ref={setList}
          role="tablist"
          aria-label="Layers"
          style={
            fade.length ? { maskImage: mask, WebkitMaskImage: mask } : undefined
          }
          className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {tab(0)}
          <Reorder.Group
            as="div"
            axis="x"
            values={order}
            onReorder={setDragOrder}
            className="flex items-center gap-1"
          >
            {order.map((id) => (
              // Tabs glide aside as the active tab gains its chevron
              <Reorder.Item
                key={id}
                as="div"
                value={id}
                transition={SPRING}
                onDragStart={() => setSettingsFor(null)}
                onDragEnd={() => commitDrag(id)}
                whileDrag={{ scale: 1.04 }}
                className="relative"
              >
                {tab(id)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
        <Tooltip content="Add a layer">
          <motion.button
            type="button"
            aria-label="Add a layer"
            onClick={add}
            layout="position"
            transition={SPRING}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Plus className="size-4" />
          </motion.button>
        </Tooltip>
      </div>
      <LayerSettingsContent
        onClose={() => setSettingsFor(null)}
        onInteractOutside={(event) => {
          // The tab's own clicks open and close its settings
          const target = event.target as Element | null;
          if (target?.closest(`[role="tab"][data-layer="${layer}"]`)) {
            event.preventDefault();
          } else {
            dismissedOutside.current = true;
          }
        }}
        onCloseAutoFocus={(event) => {
          // Back to the tab, as a trigger would; there is no trigger here
          event.preventDefault();
          if (!dismissedOutside.current) {
            activeTab.current?.focus({ preventScroll: true });
          }
        }}
      />
    </Popover>
  );
}
