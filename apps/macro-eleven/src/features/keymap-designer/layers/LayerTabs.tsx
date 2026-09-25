import { addLayer, layerIds, moveLayer } from "@glyf/keymap-schema";
import { Plus } from "lucide-react";
import { motion, Reorder } from "motion/react";
import { type KeyboardEvent, useState } from "react";
import { layerName } from "../../../entities/keymap";
import { SPRING } from "../../../shared/lib/motion";
import { useScrollEdges } from "../../../shared/lib/useScrollEdges";
import { cn } from "../../../shared/lib/utils";
import { Tooltip } from "../../../shared/ui/tooltip";
import { useDesigner, useKeymap } from "../model/KeymapProvider";

function LayerTab({
  id,
  active,
  live,
  onSelect,
  onKeyDown,
}: {
  id: number;
  active: boolean;
  /** The layer the pad is on right now. */
  live: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const keymap = useKeymap();
  return (
    <button
      type="button"
      role="tab"
      data-layer={id}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      // Select on press, so dragging a tab also brings it forward
      onPointerDown={onSelect}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring/60",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="active-layer"
          transition={SPRING}
          className="absolute inset-0 rounded-md bg-accent shadow-sm ring-1 ring-border"
        />
      )}
      <span className="relative">{layerName(keymap, id)}</span>
      {live && (
        <Tooltip content="Macro Eleven is on this layer">
          <span className="relative size-1.5 rounded-full bg-primary" />
        </Tooltip>
      )}
    </button>
  );
}

/**
 * The keymap's layers as tabs. Layer 0 stays first; drag the others, or
 * press ⌥← / ⌥→, to reorder. ⌘1–⌘9 switch layers from anywhere in the
 * designer.
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

  // Fade the edge where more tabs are scrolled out of view
  const fade = [
    edges.left && "transparent, black 24px",
    edges.right && "black calc(100% - 24px), transparent",
  ].filter(Boolean);
  const mask = `linear-gradient(to right, ${fade.join(", ")})`;

  return (
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
        <LayerTab
          id={0}
          active={layer === 0}
          live={device.hostLayer === 0}
          onSelect={() => setLayer(0)}
          onKeyDown={onKeyDown}
        />
        <Reorder.Group
          as="div"
          axis="x"
          values={order}
          onReorder={setDragOrder}
          className="flex items-center gap-1"
        >
          {order.map((id) => (
            <Reorder.Item
              key={id}
              as="div"
              value={id}
              onDragEnd={() => commitDrag(id)}
              whileDrag={{ scale: 1.04 }}
              className="relative"
            >
              <LayerTab
                id={id}
                active={layer === id}
                live={device.hostLayer === id}
                onSelect={() => setLayer(id)}
                onKeyDown={onKeyDown}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
      <Tooltip content="Add a layer">
        <button
          type="button"
          aria-label="Add a layer"
          onClick={add}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Plus className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}
