import type { UnlistenFn } from "@tauri-apps/api/event";

/** Stop every listener, including ones still registering. */
export function unlistenAll(listeners: Promise<UnlistenFn>[]): void {
  for (const listener of listeners) {
    listener.then((unlisten) => unlisten()).catch(() => {});
  }
}
