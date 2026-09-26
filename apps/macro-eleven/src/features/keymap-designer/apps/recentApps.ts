import { readStored, writeStored } from "../../../shared/lib/storage";

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
