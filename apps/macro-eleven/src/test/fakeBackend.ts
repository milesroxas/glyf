/**
 * A fake Tauri host for component tests. It answers at the IPC layer, so the
 * real typed wrappers in `shared/lib/tauri.ts` run, argument names included.
 */
import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import { emit } from "@tauri-apps/api/event";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import type { FirmwareStatus } from "../entities/firmware";
import type { Keymap } from "../entities/keymap";
import type { LoginItemStatus, Settings } from "../entities/settings";

type Args = Record<string, unknown>;

/** The host's defaults (`config/settings.rs`). */
const DEFAULT_SETTINGS: Settings = {
  menuBarIcon: true,
  menuBarLayer: false,
  dockIcon: true,
  overlayVisible: false,
  overlayOnTop: true,
  overlayAllSpaces: true,
  overlayMaterial: "glass",
  overlayTransparency: 0.6,
  overlayFadeWhenIdle: true,
  overlayShortcut: [],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakeBackend {
  active = "Work";
  hostLayer = 0;
  profiles = new Map<string, Keymap>();
  /** Every `save_profile` that succeeded, in order. */
  saves: { name: string; keymap: Keymap }[] = [];
  /** When set, `save_profile` fails with this message. */
  saveError: string | null = null;
  settings: Settings = clone(DEFAULT_SETTINGS);
  login: LoginItemStatus = "disabled";
  accessibility = true;
  firmware: FirmwareStatus = {
    mode: "ready",
    version: "1.1.2",
    bundledVersion: "1.1.2",
    updateAvailable: false,
  };
  /** Every command that changes windows (`hide_panel`, `quit_app`, …), in order. */
  calls: string[] = [];

  /** Start over with a "Work" profile (a copy of Default) plus `profiles`. */
  reset(profiles: Record<string, Keymap> = {}, active = "Work") {
    this.profiles = new Map(
      Object.entries({
        Work: { ...clone(MACRO_ELEVEN_DEFAULT_KEYMAP), name: "Work" },
        ...profiles,
      }),
    );
    this.active = active;
    this.hostLayer = 0;
    this.saves = [];
    this.saveError = null;
    this.settings = clone(DEFAULT_SETTINGS);
    this.login = "disabled";
    this.accessibility = true;
    this.firmware = {
      mode: "ready",
      version: "1.1.2",
      bundledVersion: "1.1.2",
      updateAvailable: false,
    };
    this.calls = [];
    mockWindows("main");
    mockIPC((cmd, args) => this.handle(cmd, (args ?? {}) as Args), {
      shouldMockEvents: true,
    });
  }

  /** Deliver an event the way the host would. */
  emit(event: string, payload: unknown) {
    return emit(event, payload);
  }

  keymap(name: string): Keymap {
    if (name === "Default") return clone(MACRO_ELEVEN_DEFAULT_KEYMAP);
    const keymap = this.profiles.get(name);
    if (!keymap) throw new Error(`There is no profile named "${name}"`);
    return clone(keymap);
  }

  /** Like the host: merge, then tell every window. */
  private updateSettings(patch: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...clone(patch) };
    const next = clone(this.settings);
    void emit("macro11:settings-changed", next);
    return next;
  }

  private handle(cmd: string, args: Args): unknown {
    const name = args.name as string;
    switch (cmd) {
      case "get_device_status":
        return true;
      case "get_engine_snapshot":
        return {
          layer: this.hostLayer,
          activeProfile: this.active,
          hostControl: true,
          connected: true,
        };
      case "get_permissions":
        return { accessibility: this.accessibility };
      case "get_settings":
        return clone(this.settings);
      case "update_settings":
        return this.updateSettings(args.patch as Partial<Settings>);
      case "set_overlay_visible":
        return this.updateSettings({ overlayVisible: args.visible as boolean });
      case "get_login_item":
        return this.login;
      case "set_login_item":
        this.login = args.enabled ? "enabled" : "disabled";
        return this.login;
      case "get_backdrop":
        return "glass";
      case "get_firmware_status":
        return clone(this.firmware);
      case "fit_panel":
      case "fit_settings_window":
      case "hide_panel":
      case "open_login_items_settings":
      case "pause_overlay_shortcut":
      case "plugin:event|emit_to":
      case "plugin:window|set_title":
      case "quit_app":
      case "refresh_overlay_backdrop":
      case "reset_overlay_frame":
      case "set_overlay_dimmed":
      case "show_main_window":
      case "show_settings_window":
        this.calls.push(cmd);
        return null;
      case "list_installed_apps":
        return [];
      case "list_profiles":
        return {
          active: this.active,
          profiles: [
            { name: "Default", readOnly: true, updatedAt: null },
            ...[...this.profiles.keys()].map((profile) => ({
              name: profile,
              readOnly: false,
              updatedAt: 0,
            })),
          ],
        };
      case "get_profile":
        return this.keymap(name);
      case "save_profile": {
        if (this.saveError) throw new Error(this.saveError);
        const keymap = clone(args.keymap as Keymap);
        this.profiles.set(name, keymap);
        this.saves.push({ name, keymap });
        return null;
      }
      case "create_profile": {
        const from = args.from as string | null;
        const source = from ? this.keymap(from) : undefined;
        this.profiles.set(name, {
          version: "1.0.0",
          layers: { 0: { name: "Base", keys: {} } },
          ...source,
          name,
        });
        return null;
      }
      case "set_active_profile":
        this.keymap(name);
        this.active = name;
        return null;
      default:
        throw new Error(`The fake backend does not handle ${cmd}`);
    }
  }
}

export const backend = new FakeBackend();
