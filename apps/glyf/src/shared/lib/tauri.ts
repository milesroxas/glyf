import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { DeviceStatusEvent } from "../../entities/device";
import type { DisplayStateEvent, DisplayConfig } from "../../entities/display";
import type { TouchEvent } from "../../entities/touch";

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function detectDevice(): Promise<boolean> {
  return invoke<boolean>("detect_device_cmd");
}

export async function connectDevice(): Promise<boolean> {
  return invoke<boolean>("connect_device");
}

export async function disconnectDevice(): Promise<void> {
  return invoke<void>("disconnect_device");
}

export async function setDisplayBrightness(brightness: number): Promise<void> {
  return invoke<void>("set_display_brightness", { brightness });
}

export async function setDisplayPower(on: boolean): Promise<void> {
  return invoke<void>("set_display_power", { on });
}

export async function getDisplayConfig(): Promise<DisplayConfig> {
  return invoke<DisplayConfig>("get_display_config");
}

export async function saveDisplayConfig(config: DisplayConfig): Promise<void> {
  return invoke<void>("save_display_config", { config });
}

export async function resetDisplayConfig(): Promise<void> {
  return invoke<void>("reset_display_config");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function onDeviceStatus(
  callback: (event: DeviceStatusEvent) => void
): Promise<UnlistenFn> {
  return listen<DeviceStatusEvent>("glyf:device-status", (e) =>
    callback(e.payload)
  );
}

export function onDisplayState(
  callback: (event: DisplayStateEvent) => void
): Promise<UnlistenFn> {
  return listen<DisplayStateEvent>("glyf:display-state", (e) =>
    callback(e.payload)
  );
}

export function onTouchEvent(
  callback: (event: TouchEvent) => void
): Promise<UnlistenFn> {
  return listen<TouchEvent>("glyf:touch-event", (e) => callback(e.payload));
}
