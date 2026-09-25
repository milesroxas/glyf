import {
  clearKey,
  formatMatrixPosition,
  getAction,
  parseMatrixPosition,
} from "@glyf/keymap-schema";
import { type KeyboardEvent, useState } from "react";
import { keyNumber } from "../../../entities/keymap";
import {
  type Direction,
  KEY_POSITIONS,
  neighborKey,
} from "../../../shared/config/layout";
import { usePotValue } from "../../../shared/lib/usePotValue";
import { KnobDial } from "../../../shared/ui/KnobDial";
import { MacropadGrid } from "../../../shared/ui/MacropadGrid";
import { useDragToKey } from "../apps/DragToKey";
import { useInstalledApps } from "../apps/useInstalledApps";
import { focusInspector } from "../inspector/focusInspector";
import { useDesigner, useKeymap } from "../model/KeymapProvider";
import { KeyTile } from "./KeyTile";
import { SelectionRing } from "./SelectionRing";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const MAX_POT = 1023;

/** The knob sits in the grid's empty corner, as on the pad. */
function LiveKnob() {
  const { value } = usePotValue();
  return <KnobDial value={value / MAX_POT} ticks={21} label="Knob" fluid />;
}

/**
 * The pad, drawn to scale: the thing you edit. Click a key, press it on the
 * pad, or move with the arrow keys; Delete clears; Return jumps to the
 * inspector.
 */
export function KeyCanvas() {
  const keymap = useKeymap();
  const { layer, selected, select, edit, device } = useDesigner();
  const { hoverPos } = useDragToKey();
  const { apps } = useInstalledApps();
  const [plate, setPlate] = useState<HTMLFieldSetElement | null>(null);
  const firstKey = formatMatrixPosition(KEY_POSITIONS[0]);

  // Focusing a key selects it
  const moveTo = (key: string) => {
    plate?.querySelector<HTMLButtonElement>(`[data-key-pos="${key}"]`)?.focus();
  };

  const clearSelected = () => {
    if (!selected || !getAction(keymap, layer, selected)) return;
    edit((current) => ({
      keymap: clearKey(current, layer, selected),
      undoToast: `Cleared key ${keyNumber(selected)}`,
    }));
  };

  // Keys that act on the selected key
  const commands: Record<string, () => void> = {
    Enter: focusInspector,
    Escape: () => select(null),
    Backspace: clearSelected,
    Delete: clearSelected,
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const direction = ARROWS[event.key];
    const command = selected ? commands[event.key] : undefined;
    if (direction) {
      const from = selected ? parseMatrixPosition(selected) : KEY_POSITIONS[0];
      moveTo(formatMatrixPosition(neighborKey(from, direction)));
    } else if (command) {
      command();
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <fieldset
      onKeyDown={onKeyDown}
      ref={setPlate}
      className="relative min-w-0 rounded-[26px] border bg-gradient-to-b from-card to-background p-5 shadow-[0_24px_48px_-24px_oklch(0_0_0/0.7),inset_0_1px_0_oklch(1_0_0/0.05)]"
    >
      <legend className="sr-only">Keys</legend>
      <MacropadGrid
        renderKey={(position, index) => {
          const key = formatMatrixPosition(position);
          return (
            <KeyTile
              position={position}
              action={getAction(keymap, layer, key)}
              keymap={keymap}
              apps={apps}
              selected={selected === key}
              pressed={device.pressed[index] ?? false}
              dropTarget={hoverPos === key}
              tabbable={selected ? selected === key : key === firstKey}
              onSelect={() => select(key)}
            />
          );
        }}
        renderEmpty={() => <LiveKnob />}
      />
      <SelectionRing selectedKey={selected} container={plate} />
    </fieldset>
  );
}
