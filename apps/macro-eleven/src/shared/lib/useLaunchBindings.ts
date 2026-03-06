import { useCallback, useEffect, useState } from "react";
import type { LaunchBinding } from "../../entities/keymap";
import { listLaunchBindings } from "./tauri";

export function useLaunchBindings() {
  const [bindings, setBindings] = useState<LaunchBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLaunchBindings();
      setBindings(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBindings();
  }, [loadBindings]);

  return { bindings, loading, error, refresh: loadBindings };
}
