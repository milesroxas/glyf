import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { InstalledApp } from "../../../entities/app";
import { readStored, writeStored } from "../../../shared/lib/storage";
import { listInstalledApps } from "../../../shared/lib/tauri";

/**
 * Installed apps, loaded once per session and shared by every picker, tile,
 * and editor. The designer starts loading on mount, so the picker usually
 * opens with the list ready.
 */
let apps: InstalledApp[] | null = null;
let loading: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function publish(next: InstalledApp[] | null) {
  apps = next;
  for (const notify of subscribers) notify();
}

function load(refresh: boolean): Promise<void> {
  if (loading && !refresh) return loading;
  if (refresh) publish(null);
  loading = listInstalledApps(refresh).then(publish, () => {
    loading = null;
    publish(apps ?? []);
  });
  return loading;
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

/** Installed apps (null while loading) and a rescan of the disk. */
export function useInstalledApps() {
  const current = useSyncExternalStore(subscribe, () => apps);
  useEffect(() => {
    load(false);
  }, []);
  const refresh = useCallback(() => load(true), []);
  return { apps: current, refresh };
}

const RECENTS_KEY = "designer.recentApps";
const RECENTS_LIMIT = 8;

/** Bundle IDs of recently chosen apps, most recent first. */
export function recentApps(): string[] {
  return readStored<string[]>(RECENTS_KEY, []);
}

export function rememberApp(bundleId: string): void {
  writeStored(
    RECENTS_KEY,
    [bundleId, ...recentApps().filter((id) => id !== bundleId)].slice(
      0,
      RECENTS_LIMIT,
    ),
  );
}
