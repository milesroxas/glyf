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
import { MacroStepRow, StepLabel, StepRecorder } from "./MacroStepRow";
import {
  blankStep,
  isRecorded,
  NEW_STEP_TYPES,
  type NewStepType,
  type RecordedStepType,
  STEP_LABELS,
} from "./macroSteps";

const rowKeys = new WeakMap<MacroStep, string>();
let nextRowKey = 0;

/** A row's identity follows its step object through reorders and undo. */
function rowKey(step: MacroStep): string {
  let key = rowKeys.get(step);
  if (key === undefined) {
    key = `step-${nextRowKey++}`;
    rowKeys.set(step, key);
  }
  return key;
}

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
  const keys = steps.map(rowKey);
  const [draft, setDraft] = useState<RecordedStepType | null>(null);
  const chosen = useRef<RecordedStepType | null>(null);
  const dragSession = useRef(0);

  const choose = (type: NewStepType) => {
    if (isRecorded(type)) chosen.current = type;
    else onChange([...steps, blankStep(type)]);
  };

  const replace = (index: number, step: MacroStep, coalesce?: string) => {
    rowKeys.set(step, keys[index]);
    onChange(
      steps.map((s, i) => (i === index ? step : s)),
      coalesce,
    );
  };

  const reorder = (order: string[]) => {
    const byKey = new Map(keys.map((key, i) => [key, steps[i]]));
    onChange(
      order.map((key) => byKey.get(key) as MacroStep),
      `reorder:${dragSession.current}`,
    );
  };

  const move = (index: number, offset: -1 | 1) => {
    const to = index + offset;
    if (to < 0 || to >= steps.length) return;
    const order = [...keys];
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
            values={keys}
            onReorder={reorder}
            className="grid gap-1.5"
          >
            {steps.map((step, index) => (
              <Draggable key={keys[index]} id={keys[index]}>
                {(startDrag) => (
                  <MacroStepRow
                    step={step}
                    index={index}
                    onDragHandle={(event) => {
                      dragSession.current += 1;
                      startDrag(event);
                    }}
                    onChange={(next, coalesce) =>
                      replace(index, next, coalesce)
                    }
                    onMove={(offset) => move(index, offset)}
                    onRemove={() =>
                      onChange(steps.filter((_, i) => i !== index))
                    }
                  />
                )}
              </Draggable>
            ))}
          </Reorder.Group>
        )}
      </Field>
      {draft && (
        <div className="grid gap-1.5 rounded-lg border border-primary/40 bg-primary/5 p-2">
          <StepLabel index={steps.length} type={draft} />
          <StepRecorder
            key={draft}
            autoRecord
            type={draft}
            aria-label={STEP_LABELS[draft]}
            value={[]}
            onCommit={(step) => {
              setDraft(null);
              onChange([...steps, step]);
            }}
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
            // Record only once the menu is gone: while it closes it takes
            // focus back, and a recorder that loses focus cancels
            if (!chosen.current) return;
            event.preventDefault();
            setDraft(chosen.current);
            chosen.current = null;
          }}
        >
          {NEW_STEP_TYPES.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => choose(type)}>
              {STEP_LABELS[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
