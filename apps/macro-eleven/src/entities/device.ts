export type ConnectionStatus = "connected" | "disconnected";

export interface DeviceInfo {
  connected: boolean;
}

export interface DeviceStatusEvent {
  connected: boolean;
}
