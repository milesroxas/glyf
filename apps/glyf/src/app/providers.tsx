import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ConnectionStatus } from "../entities/device";
import { connectDevice, disconnectDevice, onDeviceStatus } from "../shared/lib/tauri";

interface DeviceContextValue {
  status: ConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue>({
  status: "disconnected",
  connect: async () => {},
  disconnect: async () => {},
});

export function useDevice() {
  return useContext(DeviceContext);
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const unlisten = onDeviceStatus((event) => {
      setStatus(event.connected ? "connected" : "disconnected");
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const connect = async () => {
    setStatus("connecting");
    try {
      await connectDevice();
    } catch {
      setStatus("disconnected");
    }
  };

  const disconnect = async () => {
    await disconnectDevice();
    setStatus("disconnected");
  };

  return (
    <DeviceContext.Provider value={{ status, connect, disconnect }}>
      {children}
    </DeviceContext.Provider>
  );
}
