import { useEffect, useState } from "react";
import type { Keymap } from "../../entities/keymap";
import { unlistenAll } from "../../shared/lib/listeners";
import {
  getEngineSnapshot,
  getProfile,
  onKeymapChanged,
} from "../../shared/lib/tauri";

/** The keymap the pad is using, reloaded whenever it changes. */
export function useActiveKeymap() {
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (profile?: string) => {
      try {
        const name = profile ?? (await getEngineSnapshot()).activeProfile;
        const next = await getProfile(name);
        if (active) {
          setKeymap(next);
          setError(null);
        }
      } catch (reason) {
        if (active) setError(String(reason));
      }
    };
    const listeners = [onKeymapChanged((event) => load(event.profile))];
    load();
    return () => {
      active = false;
      unlistenAll(listeners);
    };
  }, []);

  return { keymap, error };
}
