import { Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { actionResultMessage } from "../../../entities/action";
import type { Action, Keymap } from "../../../entities/keymap";
import { CROSSFADE } from "../../../shared/lib/motion";
import { runAction } from "../../../shared/lib/tauri";
import { Button } from "../../../shared/ui/button";

/** Seconds to switch to the target app before keystrokes are sent. */
const COUNTDOWN_SECONDS = 3;

/** Keystrokes go to the front app, so they wait; opening an app does not. */
function needsCountdown(action: Action) {
  return action.action === "shortcut" || action.action === "macro";
}

/**
 * Runs the action from the app. Shortcuts and macros count down first so you
 * can switch to the app that should receive them; press again or Esc to
 * cancel.
 */
export function TryButton({
  action,
  keymap,
}: {
  action: Action;
  keymap: Keymap;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const latest = useRef({ action, keymap });
  latest.current = { action, keymap };

  const run = async () => {
    setRunning(true);
    try {
      await runAction(latest.current.action);
      toast.success(
        actionResultMessage(latest.current.action, latest.current.keymap),
      );
    } catch (error) {
      toast.error(String(error));
    } finally {
      setRunning(false);
    }
  };

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Leaving the key (or the designer) cancels a countdown
  useEffect(() => () => clearTimeout(timer.current), []);

  const cancel = () => {
    clearTimeout(timer.current);
    setRemaining(null);
  };

  const countDown = (seconds: number) => {
    setRemaining(seconds);
    timer.current = setTimeout(() => {
      if (seconds > 1) {
        countDown(seconds - 1);
      } else {
        setRemaining(null);
        void run();
      }
    }, 1000);
  };

  const counting = remaining !== null;
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={running}
      aria-live="polite"
      onClick={() => {
        if (counting) cancel();
        else if (needsCountdown(action)) countDown(COUNTDOWN_SECONDS);
        else void run();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && counting) {
          event.stopPropagation();
          cancel();
        }
      }}
      className="min-w-24 tabular-nums"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={counting ? `count-${remaining}` : "try"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={CROSSFADE}
          className="flex items-center gap-1.5"
        >
          {counting ? (
            `Sending in ${remaining}…`
          ) : (
            <>
              <Play className="size-3.5" />
              Try
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
