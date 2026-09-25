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
 * `markSaved` records a keymap that is already on disk (just loaded).
 */
export function useAutosave(
  profile: string | null,
  keymap: Keymap | null,
  save: (profile: string, keymap: Keymap) => Promise<void>,
) {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const saved = useRef<Keymap | null>(null);
  const pending = useRef<Job | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current);
    const job = pending.current;
    pending.current = null;
    if (job) {
      setState({ status: "saving" });
      queue.current = queue.current
        .then(() => save(job.profile, job.keymap))
        .then(
          () => {
            saved.current = job.keymap;
            if (!pending.current) setState({ status: "saved", at: Date.now() });
          },
          (error: unknown) => {
            // Keep the job so Retry (or the next edit) writes it
            pending.current ??= job;
            setState({ status: "error", message: String(error) });
          },
        );
    }
    return queue.current;
  }, [save]);

  const markSaved = useCallback((value: Keymap) => {
    clearTimeout(timer.current);
    pending.current = null;
    saved.current = value;
    setState({ status: "idle" });
  }, []);

  useEffect(() => {
    if (!profile || !keymap || keymap === saved.current) return;
    pending.current = { profile, keymap };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  }, [profile, keymap, flush]);

  // Write anything outstanding when the designer closes
  useEffect(() => () => void flush(), [flush]);

  return { state, flush, markSaved };
}
