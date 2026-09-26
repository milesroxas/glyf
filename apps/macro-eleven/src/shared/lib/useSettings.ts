import { useCallback, useEffect, useState } from "react";
import type { Settings } from "../../entities/settings";
import { unlistenAll } from "./listeners";
import { getSettings, onSettingsChanged, updateSettings } from "./tauri";

/**
 * The app settings, kept current across windows. `update` shows the change
 * at once and saves it; if the host refuses, the saved value comes back and
 * the error is thrown for the caller to explain.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    // Events only report changes, so read once. An event that lands first
    // is at least as new, so it wins.
    let heardEvent = false;
    const listeners = [
      onSettingsChanged((next) => {
        heardEvent = true;
        setSettings(next);
      }),
    ];
    Promise.all(listeners)
      .then(() => getSettings())
      .then((current) => {
        if (active && !heardEvent) setSettings(current);
      })
      .catch(() => {});
    return () => {
      active = false;
      unlistenAll(listeners);
    };
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((current) => current && { ...current, ...patch });
    try {
      setSettings(await updateSettings(patch));
    } catch (error) {
      setSettings(await getSettings().catch(() => null));
      throw error;
    }
  }, []);

  return { settings, update };
}
