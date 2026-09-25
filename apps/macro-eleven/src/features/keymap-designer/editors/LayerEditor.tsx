import { layerIds } from "@glyf/keymap-schema";
import type { Action, Keymap } from "../../../entities/keymap";
import { layerName } from "../../../entities/keymap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui/select";
import { Field } from "./Field";

const NEXT = "next";

type LayerAction = Extract<Action, { action: "switch_layer" | "cycle_layer" }>;

/** Where a layer key goes: a specific layer, or the next one in order. */
export function LayerEditor({
  action,
  keymap,
  onChange,
}: {
  action: LayerAction;
  keymap: Keymap;
  onChange: (action: LayerAction) => void;
}) {
  const value = action.action === "cycle_layer" ? NEXT : String(action.layer);
  return (
    <Field label="Go to">
      <Select
        value={value}
        onValueChange={(next) =>
          onChange(
            next === NEXT
              ? { action: "cycle_layer" }
              : { action: "switch_layer", layer: Number(next) },
          )
        }
      >
        <SelectTrigger aria-label="Go to layer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NEXT}>Next layer</SelectItem>
          <SelectSeparator />
          {layerIds(keymap).map((id) => (
            <SelectItem key={id} value={String(id)}>
              {layerName(keymap, id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
