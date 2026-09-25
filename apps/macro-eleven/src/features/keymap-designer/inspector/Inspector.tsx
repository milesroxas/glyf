import {
  clearKey,
  getAction,
  setKeyAction,
  setLabel,
} from "@glyf/keymap-schema";
import { MousePointerClick } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import {
  ACTION_KINDS,
  type ActionKind,
  actionKind,
  actionLabel,
  carryOver,
  describeAction,
  LABEL_MAX_LENGTH,
} from "../../../entities/action";
import {
  type Action,
  keyNumber,
  layerName,
  type MatrixPositionKey,
} from "../../../entities/keymap";
import { CROSSFADE } from "../../../shared/lib/motion";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Segmented } from "../../../shared/ui/segmented";
import { Field } from "../editors/Field";
import { useDesigner, useKeymap } from "../model/KeymapProvider";
import { defaultLayerAction } from "../model/keyActions";
import { INSPECTOR_ID } from "./focusInspector";
import { KindEditor, PluginNotice } from "./KindEditor";
import { PermissionsBanner } from "./PermissionsBanner";
import { TryButton } from "./TryButton";

/** Kinds that need input before the key can hold them (an app, a chord). */
type DraftKind = "app" | "shortcut";

/** Swaps content in place with a short cross-fade; the pane never moves. */
function Crossfade({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={id}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={CROSSFADE}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function KeyEditor({ pos }: { pos: MatrixPositionKey }) {
  const keymap = useKeymap();
  const { layer, edit } = useDesigner();
  const action = getAction(keymap, layer, pos);
  const kind = actionKind(action);
  const [draft, setDraft] = useState<DraftKind | null>(null);
  const shownKind = draft ?? kind;

  const assign = (next: Action, coalesce?: string) => {
    setDraft(null);
    edit((current) => setKeyAction(current, layer, pos, next), { coalesce });
  };

  const chooseKind = (next: ActionKind) => {
    if (next === kind) {
      setDraft(null);
    } else if (next === "none") {
      setDraft(null);
      edit((current) => clearKey(current, layer, pos));
    } else if (next === "layer") {
      assign(carryOver(defaultLayerAction(keymap, layer), action));
    } else if (next === "macro") {
      assign(carryOver({ action: "macro", sequence: [] }, action));
    } else {
      setDraft(next);
    }
  };

  if (action?.action === "plugin") {
    return (
      <PluginNotice pluginId={action.pluginId} actionId={action.actionId} />
    );
  }

  const labelLength = action?.label?.length ?? 0;
  return (
    <div className="grid gap-5">
      <PermissionsBanner
        watch={shownKind === "shortcut" || shownKind === "macro"}
      />
      <Segmented
        label="What this key does"
        value={shownKind as ActionKind}
        onValueChange={chooseKind}
        options={ACTION_KINDS.map(({ kind: value, label }) => ({
          value,
          label,
        }))}
      >
        <div className="mt-5 grid gap-5">
          {action && !draft && (
            <Field
              label="Label"
              htmlFor="key-label"
              aside={
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {labelLength}/{LABEL_MAX_LENGTH}
                </span>
              }
            >
              <Input
                id="key-label"
                value={action.label ?? ""}
                maxLength={LABEL_MAX_LENGTH}
                placeholder={describeAction(action, keymap)}
                onChange={(event) => {
                  // Read now: the edit may run later (after duplicating Default)
                  const label = event.target.value;
                  edit((current) => setLabel(current, layer, pos, label), {
                    coalesce: `label:${layer}:${pos}`,
                  });
                }}
              />
            </Field>
          )}
          <Crossfade id={shownKind}>
            <KindEditor
              kind={shownKind as ActionKind}
              pos={pos}
              action={action}
              assign={assign}
            />
          </Crossfade>
        </div>
      </Segmented>
      {action && !draft && (
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <TryButton action={action} keymap={keymap} />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() =>
              edit((current) => ({
                keymap: clearKey(current, layer, pos),
                undoToast: `Cleared key ${keyNumber(pos)}`,
              }))
            }
          >
            Clear key
          </Button>
        </div>
      )}
    </div>
  );
}

function NothingSelected() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <MousePointerClick aria-hidden className="size-6 text-muted-foreground" />
      <div className="grid gap-1">
        <p className="text-sm font-medium">Select a key</p>
        <p className="text-xs text-muted-foreground">
          Click a key, press it on Macro Eleven, or use the arrow keys.
        </p>
      </div>
    </div>
  );
}

/** Edits the selected key: what it does, its label, and a way to try it. */
export function Inspector() {
  const keymap = useKeymap();
  const { layer, selected } = useDesigner();
  const action = selected ? getAction(keymap, layer, selected) : undefined;

  return (
    <section
      id={INSPECTOR_ID}
      aria-label="Key inspector"
      className="relative h-full overflow-y-auto overscroll-contain"
    >
      <Crossfade
        id={selected ? `${layer}:${selected}` : "none"}
        className={selected ? undefined : "h-full"}
      >
        {selected ? (
          <div className="grid gap-5 p-5">
            <header className="grid gap-0.5">
              <p className="text-xs text-muted-foreground">
                {layerName(keymap, layer)} › Key {keyNumber(selected)}
              </p>
              <h2 className="truncate text-base font-semibold tracking-tight">
                {action
                  ? actionLabel(action, keymap) || "Untitled"
                  : "Empty key"}
              </h2>
            </header>
            <KeyEditor pos={selected} />
          </div>
        ) : (
          <NothingSelected />
        )}
      </Crossfade>
    </section>
  );
}
