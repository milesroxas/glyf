/**
 * Typed wrappers for every Tauri command and event the UI uses. Components
 * never call `invoke` or `listen` directly.
 */
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  ActionErrorEvent,
  ActionExecutedEvent,
} from "../../entities/action";
import type { InstalledApp } from "../../entities/app";
import type { DeviceStatusEvent } from "../../entities/device";
import type {
  FirmwareInfo,
  FirmwareProgressEvent,
  FirmwareStatus,
} from "../../entities/firmware";
import type { KeyEvent, KeyPressEvent, PotEvent } from "../../entities/key";
import type {
  Action,
  EngineSnapshot,
  Keymap,
  KeymapChangedEvent,
  LayerChangeEvent,
  ProfileList,
} from "../../entities/keymap";
import type {
  Backdrop,
  LoginItemStatus,
  Settings,
} from "../../entities/settings";

// ── Events ─────────────────────────────────────────────────────────────────

function subscribe<T>(event: string) {
  return (callback: (payload: T) => void): Promise<UnlistenFn> =>
    listen<T>(event, (e) => callback(e.payload));
}

export const onDeviceStatus = subscribe<DeviceStatusEvent>(
  "macro11:device-status",
);
/** Every key's state, when it changes. */
export const onKeyEvent = subscribe<KeyEvent>("macro11:key-event");
/** One key going down or up. */
export const onKeyPress = subscribe<KeyPressEvent>("macro11:key-press");
export const onPotValue = subscribe<PotEvent>("macro11:pot-value");
export const onLayerChange = subscribe<LayerChangeEvent>(
  "macro11:layer-change",
);
export const onActionExecuted = subscribe<ActionExecutedEvent>(
  "macro11:action-executed",
);
export const onActionError = subscribe<ActionErrorEvent>(
  "macro11:action-error",
);
export const onKeymapChanged = subscribe<KeymapChangedEvent>(
  "macro11:keymap-changed",
);
export const onFirmwareProgress = subscribe<FirmwareProgressEvent>(
  "macro11:firmware-progress",
);
/** The whole settings, after any window changed them. */
export const onSettingsChanged = subscribe<Settings>(
  "macro11:settings-changed",
);
/**
 * The menu bar panel opened. `tip` is the one-time first-close tip;
 * `backdrop` follows Reduce Transparency.
 */
export const onPanelShown = subscribe<{ tip: boolean; backdrop: Backdrop }>(
  "macro11:panel-shown",
);
/** The main window should show this page. */
export const onNavigate = subscribe<string>("macro11:navigate");
export const onOverlayBackdrop = subscribe<Backdrop>(
  "macro11:overlay-material",
);

export function onTestModeChange(
  callback: (enabled: boolean) => void,
): Promise<UnlistenFn> {
  return listen<{ enabled: boolean }>("macro11:test-mode", (e) =>
    callback(Boolean(e.payload?.enabled)),
  );
}

/** This window's label, to recognize events it caused. */
export function currentWindowLabel(): string {
  return getCurrentWebviewWindow().label;
}

// ── Device and engine ──────────────────────────────────────────────────────

/** Whether the app is connected. It connects on its own at launch and on replug. */
export function getDeviceStatus(): Promise<boolean> {
  return invoke<boolean>("get_device_status");
}

export function setTestMode(enable: boolean): Promise<void> {
  return invoke<void>("set_test_mode", { enable });
}

export function getEngineSnapshot(): Promise<EngineSnapshot> {
  return invoke<EngineSnapshot>("get_engine_snapshot");
}

/** Run an action now, on the same queue as key presses. */
export function runAction(action: Action): Promise<void> {
  return invoke<void>("run_action", { action });
}

export function getPermissions(): Promise<{ accessibility: boolean }> {
  return invoke<{ accessibility: boolean }>("get_permissions");
}

export function openAccessibilitySettings(): Promise<void> {
  return invoke<void>("open_accessibility_settings");
}

// ── Settings ───────────────────────────────────────────────────────────────

export function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/** Change some settings; they apply at once. Resolves to all of them. */
export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return invoke<Settings>("update_settings", { patch });
}

export function getLoginItem(): Promise<LoginItemStatus> {
  return invoke<LoginItemStatus>("get_login_item");
}

export function setLoginItem(enabled: boolean): Promise<LoginItemStatus> {
  return invoke<LoginItemStatus>("set_login_item", { enabled });
}

export function openLoginItemsSettings(): Promise<void> {
  return invoke<void>("open_login_items_settings");
}

/** While a new overlay shortcut is recorded, the saved one stays quiet. */
export function pauseOverlayShortcut(paused: boolean): Promise<void> {
  return invoke<void>("pause_overlay_shortcut", { paused });
}

const OVERLAY_PREVIEW = "macro11:overlay-preview";

/** Show a Transparency value on the overlay while the slider moves, unsaved. */
export function previewOverlayTransparency(value: number): Promise<void> {
  return emitTo("macro11-overlay", OVERLAY_PREVIEW, value);
}

export const onOverlayPreview = subscribe<number>(OVERLAY_PREVIEW);

// ── Windows ────────────────────────────────────────────────────────────────

/** Bring up the designer, optionally on a page (`/firmware`). */
export function showMainWindow(route?: string): Promise<void> {
  return invoke<void>("show_main_window", { route: route ?? null });
}

export function showSettingsWindow(): Promise<void> {
  return invoke<void>("show_settings_window");
}

/** Size the Settings window to its pane; the top edge stays put. */
export function fitSettingsWindow(height: number): Promise<void> {
  return invoke<void>("fit_settings_window", { height });
}

/** Size the menu bar panel to its content. */
export function fitPanel(height: number): Promise<void> {
  return invoke<void>("fit_panel", { height });
}

export function hidePanel(): Promise<void> {
  return invoke<void>("hide_panel");
}

/** Quit for real: the pad stops running actions. */
export function quitApp(): Promise<void> {
  return invoke<void>("quit_app");
}

/** The window's name in the Window menu and Mission Control. */
export function setWindowTitle(title: string): Promise<void> {
  return getCurrentWindow().setTitle(title);
}

export function setOverlayVisible(visible: boolean): Promise<Settings> {
  return invoke<Settings>("set_overlay_visible", { visible });
}

/** What a see-through window draws behind its content, after Reduce Transparency. */
export function getBackdrop(surface: "overlay" | "panel"): Promise<Backdrop> {
  return invoke<Backdrop>("get_backdrop", { surface });
}

/** Reduce Transparency changed: the host checks it again. */
export function refreshOverlayBackdrop(): Promise<void> {
  return invoke<void>("refresh_overlay_backdrop");
}

/** Fade the overlay while the pad is idle, or bring it back. */
export function setOverlayDimmed(dimmed: boolean): Promise<void> {
  return invoke<void>("set_overlay_dimmed", { dimmed });
}

/** Put the overlay back at its first size and place. */
export function resetOverlayFrame(): Promise<void> {
  return invoke<void>("reset_overlay_frame");
}

// ── Profiles ───────────────────────────────────────────────────────────────

export function listProfiles(): Promise<ProfileList> {
  return invoke<ProfileList>("list_profiles");
}

export function getProfile(name: string): Promise<Keymap> {
  return invoke<Keymap>("get_profile", { name });
}

/** Validate and save. Saving the active profile reloads the engine. */
export function saveProfile(name: string, keymap: Keymap): Promise<void> {
  return invoke<void>("save_profile", { name, keymap });
}

/** A new empty profile, or a copy of `from`. */
export function createProfile(name: string, from?: string): Promise<void> {
  return invoke<void>("create_profile", { name, from: from ?? null });
}

export function renameProfile(from: string, to: string): Promise<void> {
  return invoke<void>("rename_profile", { from, to });
}

export function deleteProfile(name: string): Promise<void> {
  return invoke<void>("delete_profile", { name });
}

export function setActiveProfile(name: string): Promise<void> {
  return invoke<void>("set_active_profile", { name });
}

export function revealProfilesDir(): Promise<void> {
  return invoke<void>("reveal_profiles_dir");
}

const KEYMAP_FILTER = { name: "Keymap", extensions: ["json"] };

/** Ask for a keymap file and import it. Resolves to the new profile's name, or null if cancelled. */
export async function importProfileFromFile(): Promise<string | null> {
  const path = await open({ filters: [KEYMAP_FILTER], multiple: false });
  if (!path) return null;
  return invoke<string>("import_profile", { path });
}

/** Ask where to save and export. Resolves to false if cancelled. */
export async function exportProfileToFile(name: string): Promise<boolean> {
  const path = await save({
    defaultPath: `${name}.json`,
    filters: [KEYMAP_FILTER],
  });
  if (!path) return false;
  await invoke<void>("export_profile", { name, path });
  return true;
}

// ── Installed apps ─────────────────────────────────────────────────────────

export function listInstalledApps(refresh = false): Promise<InstalledApp[]> {
  return invoke<InstalledApp[]>("list_installed_apps", { refresh });
}

/** Ask for any `.app` bundle. Resolves to null if cancelled. */
export async function pickAppFromFile(): Promise<InstalledApp | null> {
  const path = await open({
    directory: false,
    defaultPath: "/Applications",
    filters: [{ name: "Application", extensions: ["app"] }],
  });
  if (!path) return null;
  return invoke<InstalledApp>("describe_app", { path });
}

/** URL for an image file the host rendered (app icons). */
export function assetUrl(path: string): string {
  return convertFileSrc(path);
}

// ── Firmware ───────────────────────────────────────────────────────────────

export function getFirmwareStatus(): Promise<FirmwareStatus> {
  return invoke<FirmwareStatus>("get_firmware_status");
}

export function updateFirmware(): Promise<FirmwareInfo> {
  return invoke<FirmwareInfo>("update_firmware");
}
