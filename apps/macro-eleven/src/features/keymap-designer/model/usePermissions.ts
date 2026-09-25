import { useEffect, useState } from "react";
import { getPermissions } from "../../../shared/lib/tauri";

const POLL_MS = 1500;

/**
 * Whether macOS lets the app send keystrokes. While `watch` is set it keeps
 * checking, so a grant in System Settings shows up without a reload.
 */
export function useAccessibilityPermission(watch: boolean): boolean | null {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!watch) return;
    let active = true;
    const check = () =>
      getPermissions().then(
        ({ accessibility }) => active && setGranted(accessibility),
        () => {},
      );
    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [watch]);

  return granted;
}
