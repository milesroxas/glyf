import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ConnectionStatus } from "../entities/device";
import {
  connectDevice,
  disconnectDevice,
  getDisplayConfig,
  getDeviceConnectionSnapshot,
  onDeviceStatus,
  setDisplayBrightness,
} from "../shared/lib/tauri";

interface DeviceContextValue {
  status: ConnectionStatus;
  /** Last status line from the HID layer (what the app is doing or why it failed). */
  statusDetail: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue>({
  status: "disconnected",
  statusDetail: null,
  connect: async () => {},
  disconnect: async () => {},
});

export function useDevice() {
  return useContext(DeviceContext);
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = onDeviceStatus((event) => {
      setStatus(event.connected ? "connected" : "disconnected");
      const d = event.detail;
      setStatusDetail(
        typeof d === "string" && d.length > 0 ? d : null
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const connect = async () => {
    setStatus("connecting");
    setStatusDetail("Starting USB scan…");
    try {
      await connectDevice();
      // `invoke` returns before the HID thread emits; events can be blocked without ACL.
      // Poll host state for a few frames so the UI reaches Connected when the link is up.
      for (let i = 0; i < 45; i++) {
        if (await getDeviceConnectionSnapshot()) {
          try {
            const config = await getDisplayConfig();
            await setDisplayBrightness(config.brightness);
          } catch {
            // Keep the session alive even if config replay fails.
          }
          setStatus("connected");
          setStatusDetail(null);
          return;
        }
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }
    } catch {
      setStatus("disconnected");
      setStatusDetail("Could not start device session");
    }
  };

  const disconnect = async () => {
    await disconnectDevice();
    setStatus("disconnected");
    setStatusDetail(null);
  };

  return (
    <DeviceContext.Provider value={{ status, statusDetail, connect, disconnect }}>
      {children}
    </DeviceContext.Provider>
  );
}
