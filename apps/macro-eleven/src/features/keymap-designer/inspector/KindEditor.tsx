import { getAction, setKeyAction } from "@glyf/keymap-schema";
import { Puzzle } from "lucide-react";
import { type ActionKind, carryOver } from "../../../entities/action";
import type { InstalledApp } from "../../../entities/app";
import type { Action, MatrixPositionKey } from "../../../entities/keymap";
import { AppEditor } from "../editors/AppEditor";
import { LayerEditor } from "../editors/LayerEditor";
import { MacroEditor } from "../editors/MacroEditor";
import { ShortcutEditor } from "../editors/ShortcutEditor";
import { useDesigner, useKeymap } from "../model/KeymapProvider";
import { launchAction, shortcutConflict } from "../model/keyActions";

interface KindEditorProps {
  kind: ActionKind;
  pos: MatrixPositionKey;
  /** The key's current action; undefined while it becomes a new kind. */
  action: Action | undefined;
  assign: (next: Action, coalesce?: string) => void;
}

/** A plugin key: shown, not editable, until plugins exist. */
export function PluginNotice({
  pluginId,
  actionId,
}: {
  pluginId: string;
  actionId: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-dashed p-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Puzzle className="size-4 text-muted-foreground" />
        Plugin (unavailable)
      </p>
      <p className="text-xs text-muted-foreground">
        {pluginId} · {actionId}. Plugins arrive in a later version; this key
        does nothing until then.
      </p>
    </div>
  );
}

/** The editor for the chosen kind of action. */
export function KindEditor({ kind, pos, action, assign }: KindEditorProps) {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();

  switch (kind) {
    case "app":
      return (
        <AppEditor
          action={action?.action === "launch_app" ? action : undefined}
          onChoose={(app) => assign(launchAction(app, action))}
          onDropOnKey={(target: MatrixPositionKey, app: InstalledApp) =>
            edit((current) => ({
              keymap: setKeyAction(
                current,
                layer,
                target,
                launchAction(app, getAction(current, layer, target)),
              ),
              focus: { selected: target },
            }))
          }
          onChange={(next) => assign(next)}
        />
      );
    case "shortcut":
      return (
        <ShortcutEditor
          action={action?.action === "shortcut" ? action : undefined}
          conflict={
            action?.action === "shortcut"
              ? shortcutConflict(keymap, { layer, pos }, action.keys)
              : null
          }
          onChange={(keys) =>
            assign(carryOver({ action: "shortcut", keys }, action))
          }
        />
      );
    case "layer":
      return action?.action === "switch_layer" ||
        action?.action === "cycle_layer" ? (
        <LayerEditor
          action={action}
          keymap={keymap}
          onChange={(next) => assign(carryOver(next, action))}
        />
      ) : null;
    case "macro":
      return action?.action === "macro" ? (
        <MacroEditor
          action={action}
          onChange={(sequence, coalesce) =>
            assign({ ...action, sequence }, coalesce)
          }
        />
      ) : null;
    case "none":
      return (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          This key does nothing. Pick what it should do above.
        </p>
      );
  }
}
