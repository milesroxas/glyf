import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LayerChangeEvent, LayerData } from "../../entities/layer";
import type { KeyEvent, PotEvent } from "../../entities/key";
import type { DeviceStatusEvent } from "../../entities/device";
import type { LaunchBinding } from "../../entities/keymap";
import type {
  ActionErrorEvent,
  ActionExecutedEvent,
} from "../../entities/action";

export async function detectDevice(): Promise<boolean> {
  return invoke<boolean>("detect_device_cmd");
}

export async function connectDevice(): Promise<boolean> {
  return invoke<boolean>("connect_device");
}

export async function disconnectDevice(): Promise<void> {
  return invoke<void>("disconnect_device");
}

export async function setTestMode(enable: boolean): Promise<void> {
  return invoke<void>("set_test_mode", { enable });
}

export async function reloadKeymap(): Promise<void> {
  return invoke<void>("reload_keymap");
}

export async function openKeymapFile(): Promise<void> {
  return invoke<void>("open_active_keymap_file");
}

export async function listLaunchBindings(): Promise<LaunchBinding[]> {
  return invoke<LaunchBinding[]>("list_launch_bindings");
}

export async function getLayerData(path?: string): Promise<LayerData[]> {
  return invoke<LayerData[]>("get_layer_data", { path: path ?? null });
}

export async function openOverlayWindow(): Promise<void> {
  return invoke<void>("open_overlay_window");
}

export function onKeyEvent(
  callback: (event: KeyEvent) => void
): Promise<UnlistenFn> {
  return listen<KeyEvent>("macro11:key-event", (e) => callback(e.payload));
}

export function onLayerChange(
  callback: (event: LayerChangeEvent) => void
): Promise<UnlistenFn> {
  return listen<LayerChangeEvent>("macro11:layer-change", (e) =>
    callback(e.payload)
  );
}

export function onTestModeChange(
  callback: (enabled: boolean) => void
): Promise<UnlistenFn> {
  return listen<{ enabled: boolean }>("macro11:test-mode", (e) =>
    callback(Boolean(e.payload?.enabled))
  );
}

export function onPotValue(
  callback: (event: PotEvent) => void
): Promise<UnlistenFn> {
  return listen<PotEvent>("macro11:pot-value", (e) => callback(e.payload));
}

export function onDeviceStatus(
  callback: (event: DeviceStatusEvent) => void
): Promise<UnlistenFn> {
  return listen<DeviceStatusEvent>("macro11:device-status", (e) =>
    callback(e.payload)
  );
}

export function onActionError(
  callback: (event: ActionErrorEvent) => void
): Promise<UnlistenFn> {
  return listen<ActionErrorEvent>("macro11:action-error", (e) =>
    callback(e.payload)
  );
}

export function onActionExecuted(
  callback: (event: ActionExecutedEvent) => void
): Promise<UnlistenFn> {
  return listen<ActionExecutedEvent>("macro11:action-executed", (e) =>
    callback(e.payload)
  );
}
