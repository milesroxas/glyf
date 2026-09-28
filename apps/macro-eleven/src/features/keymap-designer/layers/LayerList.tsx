import {
  addLayer,
  autoSwitchLayers,
  layerIds,
  moveLayer,
  setAutoSwitchLayers,
} from "@glyf/keymap-schema";
import { LayoutGrid, Plus } from "lucide-react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
import { findApp } from "../../../entities/app";
import { layerName } from "../../../entities/keymap";
import { CROSSFADE, FADE, POP, SPRING } from "../../../shared/lib/motion";
import { useInstalledApps } from "../../../shared/lib/useInstalledApps";
import { cn } from "../../../shared/lib/utils";
import { AppIcon } from "../../../shared/ui/AppIcon";
import {
  SidebarAction,
  SidebarIcon,
  SidebarLabel,
  sidebarItem,
} from "../../../shared/ui/sidebar";
import { Switch } from "../../../shared/ui/switch";
import { Tooltip } from "../../../shared/ui/tooltip";
import { useDesigner, useKeymap } from "../model/KeymapProvider";
import { useLayerSettings } from "./LayerSettings";

/**
 * The pad's current layer, as a dot that travels between rows: when the
 * front app changes and the pad follows, the dot slides to the new layer.
 * It is the one thing here that moves on its own, so it is worth watching.
 */
function LiveDot() {
  return (
    <motion.span
      layoutId="live-layer"
      {...POP}
      transition={{ ...CROSSFADE, layout: SPRING }}
      className="block size-1.5 rounded-full bg-primary"
    />
  );
}

function LayerRow({
  id,
  index,
  selected,
  focusable,
  live,
  onKeyDown,
}: {
  id: number;
  /** Position in the list, for its ⌘-number. */
  index: number;
  /** Showing in the designer right now. */
  selected: boolean;
  /** The one row that Tab lands on. */
  focusable: boolean;
  /** The layer the pad is on. */
  live: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const keymap = useKeymap();
  const { showLayer } = useDesigner();
  const settings = useLayerSettings();
  const { apps } = useInstalledApps();
  const trigger = keymap.layers[id]?.triggerApp;
  const digit = index < 9 ? index + 1 : null;

  const openSettings = (element: HTMLElement) =>
    settings.open(id, element, "right");

  return (
    <button
      type="button"
      role="tab"
      data-layer={id}
      aria-label={layerName(keymap, id)}
      aria-selected={selected}
      aria-keyshortcuts={digit ? `Meta+${digit}` : undefined}
      aria-haspopup="dialog"
      aria-expanded={settings.openFor === id}
      tabIndex={focusable ? 0 : -1}
      // Select on press, so dragging a row also brings it forward
      onPointerDown={() => showLayer(id)}
      // The row opens its settings; a plain click on it closes them
      onClick={() => settings.openFor === id && settings.close()}
      onDoubleClick={(event) => openSettings(event.currentTarget)}
      onContextMenu={(event) => {
        event.preventDefault();
        openSettings(event.currentTarget);
      }}
      onKeyDown={onKeyDown}
      className={sidebarItem(selected)}
    >
      <SidebarIcon>
        {trigger ? (
          <AppIcon
            app={apps ? findApp(apps, trigger) : undefined}
            className="size-[18px] max-w-none"
          />
        ) : (
          <LayoutGrid aria-hidden />
        )}
      </SidebarIcon>
      <SidebarLabel>{layerName(keymap, id)}</SidebarLabel>
      <span className="flex w-2.5 shrink-0 justify-center">
        <AnimatePresence>{live && <LiveDot />}</AnimatePresence>
      </span>
      <kbd className="w-[22px] shrink-0 text-right font-sans text-[12px] tracking-[0.08em] text-foreground/45">
        {digit && `⌘${digit}`}
      </kbd>
    </button>
  );
}

/**
 * The profile's layers, in ⌘-number order. The base layer stays first;
 * drag the others, or press ⌥↑ / ⌥↓, to reorder. ↑ / ↓ move between
 * layers. A layer's settings open beside its row: right-click, double-click,
 * or Return, Space, or ⇧F10.
 */
export function LayerList() {
  const keymap = useKeymap();
  const { layer, showLayer, edit, device, visible, profile } = useDesigner();
  const settings = useLayerSettings();
  const ids = layerIds(keymap);
  const movable = ids.filter((id) => id !== 0);
  const [dragOrder, setDragOrder] = useState<number[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const order = dragOrder ?? movable;
  const list = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);

  const focusRow = (id: number) =>
    list.current
      ?.querySelector<HTMLButtonElement>(`[data-layer="${id}"]`)
      ?.focus();

  /**
   * Apply a new order. Layer IDs are renumbered to follow it (IDs are
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
    setDragging(null);
    setDragOrder(null);
    if (next) reorder(next, moved);
  };

  // Arrows move between layers; ⌥ with an arrow moves the layer itself
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const opensSettings =
      ["Enter", " ", "ContextMenu"].includes(event.key) ||
      (event.key === "F10" && event.shiftKey);
    if (opensSettings) {
      event.preventDefault();
      settings.open(layer, event.currentTarget, "right");
      return;
    }
    const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
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
        requestAnimationFrame(() => focusRow(viewing));
      }
      return;
    }
    const all = [0, ...order];
    const at = all.indexOf(layer);
    const next = all[Math.min(Math.max(at + step, 0), all.length - 1)];
    showLayer(next);
    focusRow(next);
  };

  const row = (id: number, index: number) => (
    <LayerRow
      id={id}
      index={index}
      selected={visible && layer === id}
      focusable={layer === id}
      live={device.hostLayer === id}
      onKeyDown={onKeyDown}
    />
  );

  return (
    // A different profile's layers fade in over the last one's
    <div ref={list} className="relative">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={profile?.name}
          role="tablist"
          aria-label="Layers"
          aria-orientation="vertical"
          {...FADE}
          className="flex flex-col gap-px"
        >
          {row(0, 0)}
          <Reorder.Group
            // The outgoing profile's list must not clear it as it leaves
            ref={(element: HTMLDivElement | null) => {
              if (element) group.current = element;
            }}
            as="div"
            axis="y"
            values={order}
            onReorder={setDragOrder}
            className="flex flex-col gap-px"
          >
            {/* A new layer eases in; the rest are there from the start */}
            <AnimatePresence initial={false}>
              {order.map((id, index) => (
                <Reorder.Item
                  key={id}
                  as="div"
                  value={id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={SPRING}
                  dragConstraints={group}
                  dragElastic={0.08}
                  onDragStart={() => {
                    settings.close();
                    setDragging(id);
                  }}
                  onDragEnd={() => commitDrag(id)}
                  // Lifts off the panel while held
                  whileDrag={{ scale: 1.02 }}
                  className={cn(
                    "relative rounded-[7px] transition-shadow duration-200 ease-(--ease-out)",
                    dragging === id &&
                      "z-10 shadow-[0_10px_24px_-10px_var(--chrome-shadow)]",
                  )}
                >
                  {row(id, index + 1)}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The Layers heading's add button: a new layer at the end, shown at once. */
export function AddLayerButton() {
  const { edit, showDesigner } = useDesigner();
  const add = () => {
    edit((current) => {
      const { keymap: next, layer: id } = addLayer(
        current,
        `Layer ${layerIds(current).length}`,
      );
      return { keymap: next, focus: { layer: id, selected: null } };
    });
    showDesigner();
  };
  return (
    <Tooltip content="Add a layer">
      <SidebarAction aria-label="Add a layer" onClick={add}>
        <Plus />
      </SidebarAction>
    </Tooltip>
  );
}

/** Switch layers as apps come to the front. A setting of the whole profile. */
export function FollowFrontApp() {
  const keymap = useKeymap();
  const { edit } = useDesigner();
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the switch is the control
    <label className="mt-0.5 flex h-[30px] items-center justify-between pr-2 pl-2.5 text-[12px] text-foreground/60">
      Follow the front app
      <Switch
        checked={autoSwitchLayers(keymap)}
        onCheckedChange={(enabled) =>
          edit((km) => setAutoSwitchLayers(km, enabled))
        }
      />
    </label>
  );
}
