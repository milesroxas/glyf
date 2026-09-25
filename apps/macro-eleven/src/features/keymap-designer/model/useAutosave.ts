import { useCallback, useEffect, useRef, useState } from "react";
import type { Keymap } from "../../../entities/keymap";

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string };

interface Job {
  profile: string;
  keymap: Keymap;
}

/** Trailing-edge delay, so typing a label writes once. */
export const AUTOSAVE_DELAY_MS = 300;

/**
 * Save `keymap` to `profile` shortly after it stops changing. Saves run one
 * at a time in order, so an older keymap can never land after a newer one.
 *
 * `markSaved` records a keymap that is already on disk (just loaded).
 * `flush` writes anything outstanding now and rejects if it could not, so a
 * caller can refuse to switch profiles over unsaved edits.
 */
export function useAutosave(
  profile: string | null,
  keymap: Keymap | null,
  save: (profile: string, keymap: Keymap) => Promise<void>,
) {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  /** What the disk holds (the last save that finished). */
  const saved = useRef<Keymap | null>(null);
  /** What the disk should end up holding (the last keymap seen). */
  const target = useRef<Keymap | null>(null);
  const pending = useRef<Job | null>(null);
  const inFlight = useRef(0);
  const lastError = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current);
    const job = pending.current;
    pending.current = null;
    if (job) {
      inFlight.current += 1;
      setState({ status: "saving" });
      queue.current = queue.current
        .then(() => save(job.profile, job.keymap))
        .then(
          () => {
            saved.current = job.keymap;
            lastError.current = null;
            if (!pending.current) setState({ status: "saved", at: Date.now() });
          },
          (error: unknown) => {
            // Keep the job so Retry (or the next edit) writes it
            pending.current ??= job;
            lastError.current = String(error);
            setState({ status: "error", message: String(error) });
          },
        )
        .finally(() => {
          inFlight.current -= 1;
        });
    }
    return queue.current.then(() => {
      if (pending.current && lastError.current) {
        throw new Error(`Your changes are not saved: ${lastError.current}`);
      }
    });
  }, [save]);

  const markSaved = useCallback((value: Keymap) => {
    clearTimeout(timer.current);
    pending.current = null;
    lastError.current = null;
    saved.current = value;
    target.current = value;
    setState({ status: "idle" });
  }, []);

  useEffect(() => {
    if (!profile || !keymap || keymap === target.current) return;
    target.current = keymap;
    clearTimeout(timer.current);
    // Back to what is on disk (an undo right after an edit): nothing to write,
    // unless an older save is still landing and would overwrite it
    if (keymap === saved.current && inFlight.current === 0) {
      pending.current = null;
      return;
    }
    pending.current = { profile, keymap };
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }, [profile, keymap, flush]);

  return { state, flush, markSaved };
}
