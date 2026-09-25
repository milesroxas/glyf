import { formatMatrixPosition, getAction } from "@glyf/keymap-schema";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { actionResultMessage } from "../../../entities/action";
import type { Keymap } from "../../../entities/keymap";
import { unlistenAll } from "../../../shared/lib/listeners";
import {
  onActionError,
  onActionExecuted,
  runAction,
} from "../../../shared/lib/tauri";

/**
 * While the designer is open, each physical key press reports its result:
 * a completion toast, or an error toast that stays until dismissed and can
 * run the action again.
 */
export function useActionToasts(keymap: Keymap | null) {
  const latest = useRef(keymap);
  latest.current = keymap;

  useEffect(() => {
    const listeners = [
      onActionExecuted((event) => {
        if (latest.current) {
          toast.success(actionResultMessage(event.action, latest.current));
        }
      }),
      onActionError((event) => {
        const action =
          latest.current &&
          getAction(
            latest.current,
            event.layer,
            formatMatrixPosition(event.position),
          );
        toast.error(event.error, {
          duration: Number.POSITIVE_INFINITY,
          action: action
            ? {
                label: "Retry",
                onClick: () =>
                  runAction(action).catch((error: unknown) =>
                    toast.error(String(error)),
                  ),
              }
            : undefined,
        });
      }),
    ];
    return () => unlistenAll(listeners);
  }, []);
}
