/**
 * Installed applications, as the app picker and app tiles show them.
 */
import type { LaunchAppAction } from "@glyf/keymap-schema";

export interface InstalledApp {
  name: string;
  bundleId: string;
  path: string;
  /** PNG on disk, null when the icon could not be rendered. */
  iconPath: string | null;
}

/** The installed app a launch action or layer trigger refers to. */
export function findApp(
  apps: readonly InstalledApp[],
  target: Pick<LaunchAppAction, "app" | "bundleId"> | string,
): InstalledApp | undefined {
  const { app, bundleId } =
    typeof target === "string" ? { app: target, bundleId: target } : target;
  return (
    (bundleId && apps.find((a) => a.bundleId === bundleId)) ||
    apps.find((a) => a.name === app)
  );
}

/** Bundle IDs all start "com.", so short queries would match every app. */
const BUNDLE_ID_MIN_QUERY = 3;

function matchScore(app: InstalledApp, query: string): number {
  const name = app.name.toLowerCase();
  if (name.startsWith(query)) return 0;
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (name.includes(query)) return 2;
  if (
    query.length >= BUNDLE_ID_MIN_QUERY &&
    app.bundleId.toLowerCase().includes(query)
  ) {
    return 3;
  }
  return -1;
}

/**
 * Apps for the picker, best match first: name prefix, word prefix, substring,
 * then bundle ID. Recently used apps lead within each tier (and the whole
 * list when there is no query), then the rest alphabetically.
 */
export function rankApps(
  apps: readonly InstalledApp[],
  query: string,
  recents: readonly string[],
): InstalledApp[] {
  const q = query.trim().toLowerCase();
  const recency = (app: InstalledApp) => {
    const i = recents.indexOf(app.bundleId);
    return i === -1 ? recents.length : i;
  };
  return apps
    .map((app) => ({ app, score: q ? matchScore(app, q) : 0 }))
    .filter(({ score }) => score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score ||
        recency(a.app) - recency(b.app) ||
        a.app.name.localeCompare(b.app.name),
    )
    .map(({ app }) => app);
}
