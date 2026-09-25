export type ConnectionStatus = "connected" | "disconnected";

export interface DeviceStatusEvent {
  connected: boolean;
}
