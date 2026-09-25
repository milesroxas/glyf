/**
 * A fake Tauri host for component tests. It answers at the IPC layer, so the
 * real typed wrappers in `shared/lib/tauri.ts` run, argument names included.
 */
import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import { emit } from "@tauri-apps/api/event";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import type { Keymap } from "../entities/keymap";

type Args = Record<string, unknown>;

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
        return { accessibility: true };
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
