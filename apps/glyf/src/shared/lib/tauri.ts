import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DeviceDebugSnapshot,
  DeviceStatusEvent,
} from "../../entities/device";
import type { DisplayConfig, DisplayStateEvent } from "../../entities/display";
import type { TouchEvent } from "../../entities/touch";

async function invokeLogged<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  console.info("[glyf] invoke", command, args ?? {});
  try {
    const result = await invoke<T>(command, args);
    console.info("[glyf] success", command, result);
    return result;
  } catch (error) {
    console.error("[glyf] failure", command, error);
    throw error;
  }
}

async function invokeQuiet<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return invoke<T>(command, args);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function detectDevice(): Promise<boolean> {
  return invokeQuiet<boolean>("detect_device_cmd");
}

export async function connectDevice(): Promise<boolean> {
  return invokeLogged<boolean>("connect_device");
}

export async function disconnectDevice(): Promise<void> {
  return invokeLogged<void>("disconnect_device");
}

/** Last known host link state (updated with each device-status emit). */
export async function getDeviceConnectionSnapshot(): Promise<boolean> {
  return invokeQuiet<boolean>("get_device_connection_snapshot");
}

export async function getDeviceDebugSnapshot(): Promise<DeviceDebugSnapshot> {
  return invokeQuiet<DeviceDebugSnapshot>("get_device_debug_snapshot");
}

export async function setDisplayBrightness(brightness: number): Promise<void> {
  return invokeLogged<void>("set_display_brightness", { brightness });
}

export async function setDisplayPower(on: boolean): Promise<void> {
  return invokeLogged<void>("set_display_power", { on });
}

/** Full-screen RGB565 fill (host → device command `0x04`). */
export async function fillDisplay(rgb565: number): Promise<void> {
  return invokeLogged<void>("fill_display", { rgb565 });
}

export async function getDisplayConfig(): Promise<DisplayConfig> {
  return invokeQuiet<DisplayConfig>("get_display_config");
}

export async function saveDisplayConfig(config: DisplayConfig): Promise<void> {
  return invokeLogged<void>("save_display_config", { config });
}

export async function resetDisplayConfig(): Promise<void> {
  return invokeLogged<void>("reset_display_config");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function onDeviceStatus(
  callback: (event: DeviceStatusEvent) => void,
): Promise<UnlistenFn> {
  return listen<DeviceStatusEvent>("glyf:device-status", (e) => {
    console.info("[glyf] event device-status", e.payload);
    callback(e.payload);
  });
}

export function onDisplayState(
  callback: (event: DisplayStateEvent) => void,
): Promise<UnlistenFn> {
  return listen<DisplayStateEvent>("glyf:display-state", (e) =>
    callback(e.payload),
  );
}

export function onTouchEvent(
  callback: (event: TouchEvent) => void,
): Promise<UnlistenFn> {
  return listen<TouchEvent>("glyf:touch-event", (e) => callback(e.payload));
}
