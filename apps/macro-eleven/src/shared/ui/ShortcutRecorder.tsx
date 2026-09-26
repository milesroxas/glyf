import {
  codeToToken,
  describeShortcut,
  formatShortcut,
  isModifierToken,
  type KeyModifier,
} from "@glyf/keymap-schema";
import { useAnimate, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

/** "chord": modifiers + one key. "key": a single key, modifiers included (macro key down/up). */
type RecorderMode = "chord" | "key";

interface ShortcutRecorderProps {
  mode?: RecorderMode;
  /** Tokens for the current value (one chord, or one token in key mode). */
  value: readonly string[];
  onCommit: (keys: string[]) => void;
  /** Backspace or Delete with no modifier held. */
  onClear?: () => void;
  /** Recording ended without a new value. */
  onCancel?: () => void;
  /** Start recording on mount (a step the user just added). */
  autoRecord?: boolean;
  /** Refuse a finished chord: return why, and recording goes on. */
  validate?: (keys: string[]) => string | null;
  /** Recording started or stopped. */
  onRecordingChange?: (recording: boolean) => void;
  "aria-label": string;
  className?: string;
}

/** What a key-down means while recording. */
type Intent =
  | { type: "cancel" }
  | { type: "clear" }
  | { type: "reject" }
  /** Modifiers held with no key yet (shown live). */
  | { type: "hold"; keys: string[] }
  /** A complete value, kept when `code` comes back up. */
  | { type: "press"; code: string; keys: string[] };

function heldModifiers(event: KeyboardEvent): KeyModifier[] {
  return [
    event.ctrlKey && "ctrl",
    event.altKey && "option",
    event.shiftKey && "shift",
    event.metaKey && "cmd",
  ].filter((m): m is KeyModifier => Boolean(m));
}

function readKey(event: KeyboardEvent, mode: RecorderMode): Intent {
  const modifiers = heldModifiers(event);
  const alone = modifiers.length === 0;
  if (alone && event.code === "Escape") return { type: "cancel" };
  if (alone && (event.code === "Backspace" || event.code === "Delete")) {
    return { type: "clear" };
  }
  const token = codeToToken(event.code);
  if (!token) return { type: "reject" };
  if (isModifierToken(token)) {
    return mode === "key"
      ? { type: "press", code: event.code, keys: [token] }
      : { type: "hold", keys: modifiers };
  }
  const keys = mode === "key" ? [token] : [...modifiers, token];
  return { type: "press", code: event.code, keys };
}

const UNSENDABLE =
  "Macro Eleven can’t send that key. Try letters, numbers, arrows, or F1–F12.";

function announcement(recording: boolean, rejected: string | null): string {
  if (rejected === UNSENDABLE) return "That key cannot be sent. Try another.";
  if (rejected) return rejected;
  return recording ? "Recording. Press a shortcut." : "";
}

/** The keys as glyphs, or a prompt when there are none. */
function RecorderText({
  keys,
  recording,
}: {
  keys: readonly string[];
  recording: boolean;
}) {
  const glyphs = formatShortcut(keys).join(" ");
  if (glyphs) {
    return (
      <span className="truncate text-sm font-medium tracking-[0.12em]">
        {glyphs}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-sm",
        recording ? "text-primary" : "text-muted-foreground",
      )}
    >
      {recording ? "Recording…" : "Click to record"}
    </span>
  );
}

/**
 * A field that records a keyboard shortcut, like the recorders in System
 * Settings. Click it (or press Return) and press keys: the chord shows as
 * glyphs while held and is kept when the key comes up. Esc cancels, and
 * Backspace alone clears. Keys the pad cannot send, and chords `validate`
 * refuses, give a short shake and say why.
 */
export function ShortcutRecorder({
  mode = "chord",
  value,
  onCommit,
  onClear,
  onCancel,
  autoRecord = false,
  validate,
  onRecordingChange,
  "aria-label": label,
  className,
}: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false);
  const recordingChanged = useRef(onRecordingChange);
  recordingChanged.current = onRecordingChange;
  const [live, setLive] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const pending = useRef<{ code: string; keys: string[] } | null>(null);
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const reduceMotion = useReducedMotion();

  const start = () => {
    pending.current = null;
    setLive([]);
    setRecording(true);
  };

  const stop = () => {
    pending.current = null;
    setLive([]);
    setRecording(false);
  };

  // Wait a frame: the click that added this recorder would take focus back
  useEffect(() => {
    if (!autoRecord) return;
    const frame = requestAnimationFrame(() => {
      scope.current?.focus();
      setRecording(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [autoRecord, scope]);

  useEffect(() => {
    recordingChanged.current?.(recording);
  }, [recording]);

  useEffect(() => {
    if (!rejected) return;
    const timer = setTimeout(() => setRejected(null), 2400);
    return () => clearTimeout(timer);
  }, [rejected]);

  const reject = (reason = UNSENDABLE) => {
    setRejected(reason);
    // Reduced motion: the border flashes instead (data-rejected)
    if (!reduceMotion && scope.current) {
      animate(scope.current, { x: [0, -4, 4, -4, 4, 0] }, { duration: 0.2 });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        start();
      }
      return;
    }
    // While recording, every key belongs to the recorder (⌘Z included)
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    const intent = readKey(event, mode);
    switch (intent.type) {
      case "cancel":
        stop();
        onCancel?.();
        break;
      case "clear":
        stop();
        (onClear ?? onCancel)?.();
        break;
      case "reject":
        reject();
        break;
      case "hold":
        setLive(intent.keys);
        break;
      case "press":
        pending.current = { code: intent.code, keys: intent.keys };
        setLive(intent.keys);
        break;
    }
  };

  // Any key coming up keeps the chord: macOS sends no key-up for a key
  // pressed with ⌘ held, only for ⌘ itself
  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();
    const done = pending.current;
    const problem = done && validate?.(done.keys);
    if (done && problem) {
      pending.current = null;
      setLive([]);
      reject(problem);
    } else if (done) {
      stop();
      onCommit(done.keys);
    } else if (mode === "chord") {
      setLive(heldModifiers(event));
    }
  };

  const onBlur = () => {
    if (!recording) return;
    // Another app or window took focus (a system shortcut, or checking the
    // shortcut elsewhere): keep recording for when this window comes back
    if (!document.hasFocus()) {
      pending.current = null;
      setLive([]);
      return;
    }
    stop();
    onCancel?.();
  };

  return (
    <div className={cn("min-w-0", className)}>
      <button
        ref={scope}
        type="button"
        aria-label={`${label}: ${value.length ? describeShortcut(value) : "none"}`}
        aria-pressed={recording}
        data-rejected={rejected ? "" : undefined}
        onClick={() => (recording ? undefined : start())}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        className={cn(
          "flex h-8 w-full min-w-0 items-center rounded-md border border-input bg-input/30 px-2.5 text-left shadow-xs outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
          recording &&
            "border-primary/70 bg-primary/5 ring-[3px] ring-primary/25",
          "data-[rejected]:border-destructive",
        )}
      >
        <RecorderText keys={recording ? live : value} recording={recording} />
        <span aria-live="polite" className="sr-only">
          {announcement(recording, rejected)}
        </span>
      </button>
      {rejected && (
        <p className="mt-1.5 text-xs text-destructive">{rejected}</p>
      )}
    </div>
  );
}
