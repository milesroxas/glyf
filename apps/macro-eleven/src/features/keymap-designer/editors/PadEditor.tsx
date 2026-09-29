import { APP_COMMANDS, type AppCommand, layerIds } from "@glyf/keymap-schema";
import { APP_COMMAND_NAMES } from "../../../entities/action";
import type { Action, Keymap } from "../../../entities/keymap";
import { layerName } from "../../../entities/keymap";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui/select";
import { Field } from "./Field";

const NEXT = "next";
const COMMAND = "command:";

type PadAction = Extract<
  Action,
  { action: "switch_layer" | "cycle_layer" | "app_command" }
>;

function selectValue(action: PadAction): string {
  switch (action.action) {
    case "cycle_layer":
      return NEXT;
    case "switch_layer":
      return String(action.layer);
    case "app_command":
      return COMMAND + action.command;
  }
}

function actionFor(value: string): PadAction {
  if (value === NEXT) return { action: "cycle_layer" };
  if (value.startsWith(COMMAND)) {
    const command = value.slice(COMMAND.length) as AppCommand;
    return { action: "app_command", command };
  }
  return { action: "switch_layer", layer: Number(value) };
}

/**
 * What a pad key does: go to a layer (a specific one, or the next in
 * order), or show or hide the overlay.
 */
export function PadEditor({
  action,
  keymap,
  onChange,
}: {
  action: PadAction;
  keymap: Keymap;
  onChange: (action: PadAction) => void;
}) {
  return (
    <Field label="Action">
      <Select
        value={selectValue(action)}
        onValueChange={(next) => onChange(actionFor(next))}
      >
        <SelectTrigger aria-label="Pad action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Go to layer</SelectLabel>
            <SelectItem value={NEXT}>Next layer</SelectItem>
            {layerIds(keymap).map((id) => (
              <SelectItem key={id} value={String(id)}>
                {layerName(keymap, id)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Overlay</SelectLabel>
            {APP_COMMANDS.map((command) => (
              <SelectItem key={command} value={COMMAND + command}>
                {APP_COMMAND_NAMES[command]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
