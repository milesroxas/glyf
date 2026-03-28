export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface DeviceInfo {
  connected: boolean;
}

export type { DeviceStatusEvent } from "@glyf/display-schema";
