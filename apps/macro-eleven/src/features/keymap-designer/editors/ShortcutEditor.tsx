import {
  type Chord,
  chordsToKeys,
  formatShortcut,
  parseShortcut,
} from "@glyf/keymap-schema";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { ShortcutAction } from "../../../entities/keymap";
import { ShortcutRecorder } from "../../../shared/ui/ShortcutRecorder";
import { Field, Warning } from "./Field";

interface ShortcutEditorProps {
  /** Undefined while the key is becoming a shortcut key. */
  action: ShortcutAction | undefined;
  /** Another key on this layer sends the same shortcut ("Key 3, New Tab"). */
  conflict: string | null;
  onChange: (keys: string[]) => void;
}

function chordKeys(chord: Chord): string[] {
  return chordsToKeys([chord]);
}

/**
 * One recorder per chord. "Add step" builds a sequence such as ⌘K then ⌘S.
 * Nothing is saved until a chord is recorded, so the key never holds an
 * empty shortcut.
 */
export function ShortcutEditor({
  action,
  conflict,
  onChange,
}: ShortcutEditorProps) {
  const [adding, setAdding] = useState(false);
  const chords = action ? parseShortcut(action.keys) : [];

  const replace = (next: Chord[]) => {
    if (next.length > 0) onChange(chordsToKeys(next));
  };
  const recorded = (keys: string[]) => parseShortcut(keys)?.[0];

  return (
    <div className="grid gap-3">
      <Field label={chords && chords.length > 1 ? "Sequence" : "Shortcut"}>
        <div className="grid gap-2">
          {chords === null && action && (
            <>
              <ShortcutRecorder
                aria-label="Shortcut"
                value={action.keys}
                onCommit={onChange}
              />
              <Warning>
                {formatShortcut(action.keys).join(" ")} has a key the app can’t
                send. Record it again.
              </Warning>
            </>
          )}
          {chords?.map((chord, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional, and the same chord can repeat
              key={`${index}-${chordKeys(chord).join("+")}`}
              className="flex items-center gap-2"
            >
              {chords.length > 1 && (
                <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                  {index === 0 ? "Press" : "then"}
                </span>
              )}
              <ShortcutRecorder
                className="flex-1"
                aria-label={
                  chords.length > 1 ? `Step ${index + 1}` : "Shortcut"
                }
                value={chordKeys(chord)}
                onCommit={(keys) => {
                  const next = recorded(keys);
                  if (next)
                    replace(chords.map((c, i) => (i === index ? next : c)));
                }}
                onClear={() => replace(chords.filter((_, i) => i !== index))}
              />
              {chords.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() => replace(chords.filter((_, i) => i !== index))}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {(adding || !action) && (
            <ShortcutRecorder
              autoRecord
              aria-label={action ? "New step" : "Shortcut"}
              value={[]}
              onCommit={(keys) => {
                setAdding(false);
                const next = recorded(keys);
                if (next) replace([...(chords ?? []), next]);
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      </Field>
      {chords && chords.length > 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <Plus className="size-3.5" />
          Add step
        </button>
      )}
      {conflict && <Warning>{conflict} sends the same shortcut.</Warning>}
    </div>
  );
}
