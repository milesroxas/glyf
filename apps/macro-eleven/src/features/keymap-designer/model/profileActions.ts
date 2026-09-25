import { toast } from "sonner";
import * as ipc from "../../../shared/lib/tauri";

interface ProfileContext {
  /** The active profile's name. */
  profile: string;
  /** Write pending edits before the profile changes under them. */
  flush: () => Promise<void>;
  /** Save pending edits, run `work`, then load the active profile. */
  change: (work: () => Promise<unknown>) => Promise<void>;
}

/**
 * Profile menu actions. Each one that changes profiles saves pending edits
 * first and loads the result after, so the designer always shows the profile
 * the pad is using.
 */
export function profileActions({ profile, flush, change }: ProfileContext) {
  /** Make `name` active, creating it first (optionally as a copy). */
  const activate = (name: string, create?: { from?: string }) =>
    change(async () => {
      if (create) await ipc.createProfile(name, create.from);
      await ipc.setActiveProfile(name);
    });

  return {
    activate,
    switchProfile: (name: string) => activate(name),
    createProfile: (name: string, from?: string) => activate(name, { from }),
    renameProfile: (to: string) => change(() => ipc.renameProfile(profile, to)),
    deleteProfile: () => change(() => ipc.deleteProfile(profile)),
    importProfile: async () => {
      const name = await ipc.importProfileFromFile();
      if (!name) return;
      await activate(name);
      toast.success(`Imported “${name}”`);
    },
    exportProfile: async () => {
      await flush();
      if (await ipc.exportProfileToFile(profile)) {
        toast.success(`Exported “${profile}”`);
      }
    },
  };
}
