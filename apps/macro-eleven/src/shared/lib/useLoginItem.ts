import { useCallback, useEffect, useState } from "react";
import type { LoginItemStatus } from "../../entities/settings";
import { getLoginItem, setLoginItem } from "./tauri";

/**
 * Open at Login, as macOS has it. The user can also change it in System
 * Settings, so it is read again whenever this window comes forward.
 */
export function useLoginItem() {
  const [status, setStatus] = useState<LoginItemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getLoginItem().then(setStatus, () => setStatus("unavailable"));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const set = useCallback(async (enabled: boolean) => {
    setError(null);
    // Show the switch moving now; macOS answers in a moment
    setStatus(enabled ? "enabled" : "disabled");
    try {
      setStatus(await setLoginItem(enabled));
    } catch (reason) {
      setError(String(reason));
      setStatus(await getLoginItem().catch(() => "unavailable" as const));
    }
  }, []);

  return { status, error, set, refresh };
}
