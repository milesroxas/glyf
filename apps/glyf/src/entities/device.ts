export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface DeviceInfo {
  connected: boolean;
}

export interface DeviceDebugSnapshot {
  running: boolean;
  hostConnected: boolean;
  deviceHandleOpen: boolean;
  pollCount: number;
  commandCount: number;
  lastDeviceStatus: string | null;
  lastPollAtMs: number | null;
  lastReadSize: number | null;
  lastCommandAtMs: number | null;
  lastCommand: string | null;
  lastCommandValue: string | null;
  lastCommandStatus: string | null;
  lastCommandError: string | null;
  lastBrightness: number | null;
  lastDisplayOn: boolean | null;
  lastTouchPressed: boolean | null;
  lastTouchX: number | null;
  lastTouchY: number | null;
  lastTouchZ: number | null;
}

export type { DeviceStatusEvent } from "@glyf/display-schema";
