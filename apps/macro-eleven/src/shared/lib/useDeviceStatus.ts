import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../../entities/device";
import { getDeviceStatus, onDeviceStatus } from "./tauri";

/** Tracks the connection the backend opens on its own at launch and on replug. */
export function useDeviceStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    let active = true;
    // Events only fire on change, so read the current status once. An event
    // that lands first is at least as new, so it wins.
    let heardEvent = false;
    const unlisten = onDeviceStatus((event) => {
      heardEvent = true;
      setStatus(event.connected ? "connected" : "disconnected");
    });
    unlisten
      .then(() => getDeviceStatus())
      .then((connected) => {
        if (active && !heardEvent) {
          setStatus(connected ? "connected" : "disconnected");
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      unlisten.then((fn) => fn());
    };
  }, []);

  return status;
}
