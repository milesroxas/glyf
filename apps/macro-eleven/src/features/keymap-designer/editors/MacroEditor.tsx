import { Plus } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import type { MacroAction, MacroStep } from "../../../entities/keymap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../shared/ui/dropdown-menu";
import { Field } from "./Field";
import { MacroStepRow, STEP_LABELS } from "./MacroStepRow";
import { ShortcutRecorder } from "./ShortcutRecorder";

type NewStep = "shortcut" | "text" | "wait" | "keydown" | "keyup";

const NEW_STEPS: readonly NewStep[] = [
  "shortcut",
  "text",
  "wait",
  "keydown",
  "keyup",
];

/** Steps that are complete as soon as they exist; the others need a key first. */
const READY: Partial<Record<NewStep, MacroStep>> = {
  text: { type: "text", text: "" },
  wait: { type: "wait", ms: 100 },
};

let nextId = 0;
const newId = () => `step-${nextId++}`;

function Draggable({
  id,
  children,
}: {
  id: string;
  children: (startDrag: (event: PointerEvent) => void) => ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      data-step={id}
      className="list-none"
    >
      {children((event) => controls.start(event))}
    </Reorder.Item>
  );
}

/**
 * An ordered list of steps: shortcuts, typed text, waits, and key down/up.
 * Drag the handle to reorder. Held modifiers are released when the macro
 * ends, even if a step fails.
 */
export function MacroEditor({
  action,
  onChange,
}: {
  action: MacroAction;
  onChange: (sequence: MacroStep[], coalesce?: string) => void;
}) {
  const steps = action.sequence;
  // Stable row identities, so typing in a step keeps its focus
  const [ids, setIds] = useState(() => steps.map(newId));
  const rowIds = ids.length === steps.length ? ids : steps.map(newId);
  if (rowIds !== ids) setIds(rowIds);
  const [draft, setDraft] = useState<"shortcut" | "keydown" | "keyup" | null>(
    null,
  );
  const dragSession = useRef(0);
  // The new step's recorder takes focus; the menu must not take it back
  const keepFocus = useRef(false);

  const add = (type: NewStep) => {
    const ready = READY[type];
    if (ready) {
      setIds([...rowIds, newId()]);
      onChange([...steps, ready]);
    } else {
      keepFocus.current = true;
      setDraft(type as "shortcut" | "keydown" | "keyup");
    }
  };

  const commitDraft = (keys: string[]) => {
    const step: MacroStep | null =
      draft === "shortcut"
        ? { type: "shortcut", keys }
        : draft
          ? { type: draft, key: keys[0] }
          : null;
    setDraft(null);
    if (step) {
      setIds([...rowIds, newId()]);
      onChange([...steps, step]);
    }
  };

  const move = (index: number, offset: -1 | 1) => {
    const to = index + offset;
    if (to < 0 || to >= steps.length) return;
    const order = [...rowIds];
    [order[index], order[to]] = [order[to], order[index]];
    dragSession.current += 1; // each move is its own undo step
    reorder(order);
    // Keep the handle focused as its row moves
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-step="${order[to]}"] button`)
        ?.focus(),
    );
  };

  const reorder = (order: string[]) => {
    const byId = new Map(rowIds.map((id, i) => [id, steps[i]]));
    setIds(order);
    onChange(
      order.map((id) => byId.get(id) as MacroStep),
      `reorder:${dragSession.current}`,
    );
  };

  return (
    <div className="grid gap-3">
      <Field label="Steps">
        {steps.length === 0 && !draft ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            Add steps to run in order: shortcuts, text, waits, and keys.
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={rowIds}
            onReorder={reorder}
            className="grid gap-1.5"
          >
            {rowIds.map((id, index) => (
              <Draggable key={id} id={id}>
                {(startDrag) => (
                  <MacroStepRow
                    step={steps[index]}
                    index={index}
                    onDragHandle={(event) => {
                      dragSession.current += 1;
                      startDrag(event);
                    }}
                    onChange={(step, coalesce) =>
                      onChange(
                        steps.map((s, i) => (i === index ? step : s)),
                        coalesce,
                      )
                    }
                    onMove={(offset) => move(index, offset)}
                    onRemove={() => {
                      setIds(rowIds.filter((_, i) => i !== index));
                      onChange(steps.filter((_, i) => i !== index));
                    }}
                  />
                )}
              </Draggable>
            ))}
          </Reorder.Group>
        )}
      </Field>
      {draft && (
        <div className="grid gap-1.5 rounded-lg border border-primary/40 bg-primary/5 p-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {steps.length + 1}. {STEP_LABELS[draft]}
          </span>
          <ShortcutRecorder
            autoRecord
            mode={draft === "shortcut" ? "chord" : "key"}
            aria-label={STEP_LABELS[draft]}
            value={[]}
            onCommit={commitDraft}
            onCancel={() => setDraft(null)}
          />
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-accent">
          <Plus className="size-3.5" />
          Add step
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-40"
          onCloseAutoFocus={(event) => {
            if (keepFocus.current) event.preventDefault();
            keepFocus.current = false;
          }}
        >
          {NEW_STEPS.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => add(type)}>
              {STEP_LABELS[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
