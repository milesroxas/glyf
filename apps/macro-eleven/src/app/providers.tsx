import { createContext, type ReactNode, useContext } from "react";
import type { ConnectionStatus } from "../entities/device";
import { useDeviceStatus } from "../shared/lib/useDeviceStatus";

interface DeviceContextValue {
  status: ConnectionStatus;
}

const DeviceContext = createContext<DeviceContextValue>({
  status: "disconnected",
});

export function useDevice() {
  return useContext(DeviceContext);
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const status = useDeviceStatus();

  return (
    <DeviceContext.Provider value={{ status }}>
      {children}
    </DeviceContext.Provider>
  );
}
