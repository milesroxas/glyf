import { GripVertical, X } from "lucide-react";
import type { PointerEvent } from "react";
import type { MacroStep } from "../../../entities/keymap";
import { Input } from "../../../shared/ui/input";
import { Slider } from "../../../shared/ui/slider";
import { ShortcutRecorder } from "./ShortcutRecorder";

/** Slider range for waits; the number field allows up to the host's limit. */
const WAIT_SLIDER_MAX_MS = 2000;
const WAIT_MAX_MS = 10_000;

export const STEP_LABELS: Record<MacroStep["type"], string> = {
  shortcut: "Shortcut",
  text: "Type text",
  wait: "Wait",
  keydown: "Key down",
  keyup: "Key up",
  keypress: "Press key",
};

interface MacroStepRowProps {
  step: MacroStep;
  index: number;
  /** `coalesce` merges a run of edits (typing, dragging a slider) into one undo step. */
  onChange: (step: MacroStep, coalesce?: string) => void;
  onRemove: () => void;
  onDragHandle: (event: PointerEvent) => void;
  /** Move the step up (-1) or down (1): the handle's keyboard equivalent. */
  onMove: (offset: -1 | 1) => void;
}

function StepBody({
  step,
  index,
  onChange,
}: Pick<MacroStepRowProps, "step" | "index" | "onChange">) {
  const name = `Step ${index + 1}`;
  switch (step.type) {
    case "shortcut":
      return (
        <ShortcutRecorder
          aria-label={name}
          value={step.keys}
          onCommit={(keys) => onChange({ type: "shortcut", keys })}
        />
      );
    case "keydown":
    case "keyup":
    case "keypress":
      return (
        <ShortcutRecorder
          mode="key"
          aria-label={name}
          value={[step.key]}
          onCommit={([key]) => onChange({ type: step.type, key })}
        />
      );
    case "text":
      return (
        <Input
          aria-label={`${name}, text to type`}
          value={step.text}
          placeholder="Text to type"
          onChange={(event) =>
            onChange(
              { type: "text", text: event.target.value },
              `text:${index}`,
            )
          }
        />
      );
    case "wait": {
      const setMs = (ms: number) =>
        onChange(
          {
            type: "wait",
            ms: Math.round(Math.min(Math.max(ms, 0), WAIT_MAX_MS)),
          },
          `wait:${index}`,
        );
      return (
        <div className="flex items-center gap-2">
          <Slider
            aria-label={`${name}, wait in milliseconds`}
            min={0}
            max={WAIT_SLIDER_MAX_MS}
            step={10}
            value={[Math.min(step.ms, WAIT_SLIDER_MAX_MS)]}
            onValueChange={([ms]) => setMs(ms)}
          />
          <div className="relative w-20 shrink-0">
            <Input
              type="number"
              aria-label={`${name}, milliseconds`}
              min={0}
              max={WAIT_MAX_MS}
              step={10}
              value={step.ms}
              onChange={(event) => setMs(Number(event.target.value))}
              className="pr-7 text-right tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
              ms
            </span>
          </div>
        </div>
      );
    }
  }
}

/** One step of a macro, with its drag handle and remove button. */
export function MacroStepRow({
  step,
  index,
  onChange,
  onRemove,
  onDragHandle,
  onMove,
}: MacroStepRowProps) {
  return (
    <div className="flex items-start gap-1.5 rounded-lg border bg-card/60 p-2">
      <button
        type="button"
        aria-label={`Reorder step ${index + 1}. Use the up and down arrows.`}
        onPointerDown={onDragHandle}
        onKeyDown={(event) => {
          const offset = { ArrowUp: -1, ArrowDown: 1 }[event.key] as
            | -1
            | 1
            | undefined;
          if (!offset) return;
          event.preventDefault();
          onMove(offset);
        }}
        className="mt-1.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          {index + 1}. {STEP_LABELS[step.type]}
        </span>
        <StepBody step={step} index={index} onChange={onChange} />
      </div>
      <button
        type="button"
        aria-label={`Remove step ${index + 1}`}
        onClick={onRemove}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
