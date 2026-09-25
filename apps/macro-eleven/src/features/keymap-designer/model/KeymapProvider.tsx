/**
 * Designer state: the active profile's keymap, undo history, the selected
 * layer and key, autosave, and profile actions. Every edit goes through
 * `edit`, which records history and schedules a save; saving the active
 * profile reloads the engine, so the pad follows each edit.
 */
import { layerIds } from "@glyf/keymap-schema";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  DEFAULT_PROFILE,
  type Keymap,
  type MatrixPositionKey,
  type ProfileSummary,
  uniqueName,
} from "../../../entities/keymap";
import { unlistenAll } from "../../../shared/lib/listeners";
import { useStoredState } from "../../../shared/lib/storage";
import * as ipc from "../../../shared/lib/tauri";
import { useDeviceStatus } from "../../../shared/lib/useDeviceStatus";
import { useKeyEvents } from "../../../shared/lib/useKeyEvents";
import type { Focus } from "./history";
import { profileActions } from "./profileActions";
import { useActionToasts } from "./useActionToasts";
import { type SaveState, useAutosave } from "./useAutosave";
import { useDesignerShortcuts } from "./useDesignerShortcuts";
import { useDeviceKeySelection } from "./useDeviceKeySelection";
import { useHistoryState } from "./useHistoryState";

/** What an edit produces: a keymap, and optionally where to look next. */
interface EditOutcome {
  keymap: Keymap;
  focus?: Partial<Focus>;
  /** Offer an Undo toast with this message (clearing, deleting). */
  undoToast?: string;
}

type EditOp = (keymap: Keymap) => Keymap | EditOutcome;

interface EditOptions {
  /** Consecutive edits with the same key are one undo step. */
  coalesce?: string;
}

interface ActiveProfile {
  name: string;
  readOnly: boolean;
}

interface DesignerContextValue {
  profiles: ProfileSummary[];
  profile: ActiveProfile | null;
  keymap: Keymap | null;
  loadError: string | null;
  retryLoad: () => void;
  layer: number;
  selected: MatrixPositionKey | null;
  setLayer: (layer: number) => void;
  select: (pos: MatrixPositionKey | null) => void;
  edit: (op: EditOp, options?: EditOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: SaveState;
  retrySave: () => void;
  device: {
    connected: boolean;
    /** Held keys, by index in key-state reports. */
    pressed: readonly boolean[];
    /** The host's live layer; null while the firmware runs its own keymap. */
    hostLayer: number | null;
  };
  selectByPressing: boolean;
  setSelectByPressing: (enabled: boolean) => void;
  /** Suggested name while asking to duplicate the read-only Default. */
  duplicatePrompt: string | null;
  confirmDuplicate: (name: string) => Promise<void>;
  cancelDuplicate: () => void;
  switchProfile: (name: string) => Promise<void>;
  createProfile: (name: string, from?: string) => Promise<void>;
  renameProfile: (to: string) => Promise<void>;
  deleteProfile: () => Promise<void>;
  importProfile: () => Promise<void>;
  exportProfile: () => Promise<void>;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function useDesigner(): DesignerContextValue {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error("useDesigner must be used inside KeymapProvider");
  }
  return context;
}

/** The keymap once loaded; components below the loading gate use this. */
export function useKeymap(): Keymap {
  const { keymap } = useDesigner();
  if (!keymap) throw new Error("The keymap has not loaded");
  return keymap;
}

export function KeymapProvider({ children }: { children: ReactNode }) {
  const state = useHistoryState();
  const { history, focus, latest, commit, navigate, reset, undo } = state;
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<string | null>(null);
  const [selectByPressing, setSelectByPressing] = useStoredState(
    "designer.selectByPressing",
    true,
  );
  const connected = useDeviceStatus() === "connected";
  const { keys: pressed, hostLayer } = useKeyEvents();

  // Callbacks that outlive a render read the latest values here
  const live = useRef({ profile, profiles, hostLayer });
  live.current = { profile, profiles, hostLayer };

  const keymap = history.present?.keymap ?? null;
  const autosave = useAutosave(
    profile && !profile.readOnly ? profile.name : null,
    keymap,
    ipc.saveProfile,
  );
  const { markSaved, flush } = autosave;
  const retrySave = useCallback(() => void flush(), [flush]);
  useActionToasts(keymap);

  const load = useCallback(async () => {
    try {
      const list = await ipc.listProfiles();
      const loaded = await ipc.getProfile(list.active);
      const summary = list.profiles.find((p) => p.name === list.active);
      const active = {
        name: list.active,
        readOnly: summary?.readOnly ?? list.active === DEFAULT_PROFILE,
      };
      markSaved(loaded);
      live.current.profile = active;
      setProfile(active);
      setProfiles(list.profiles);
      reset(loaded);
      setLoadError(null);
    } catch (error) {
      setLoadError(String(error));
    }
  }, [markSaved, reset]);

  useEffect(() => {
    load();
    // Reload when another window changes the active profile
    const self = ipc.currentWindowLabel();
    const listeners = [
      ipc.onKeymapChanged((event) => {
        if (event.source !== self) load();
      }),
    ];
    return () => unlistenAll(listeners);
  }, [load]);

  const undoToast = useRef<string | number | undefined>(undefined);
  const pendingEdit = useRef<{ op: EditOp; options?: EditOptions } | null>(
    null,
  );

  const edit = useCallback(
    (op: EditOp, options?: EditOptions) => {
      const { history: current, focus: before } = latest();
      const active = live.current.profile;
      if (!current.present || !active) return;
      if (active.readOnly) {
        // Editing Default: ask once to duplicate it, then apply this edit
        pendingEdit.current = { op, options };
        const names = live.current.profiles.map((p) => p.name);
        setDuplicatePrompt(uniqueName("My keymap", names));
        return;
      }
      const result = op(current.present.keymap);
      const outcome = "keymap" in result ? result : { keymap: result };
      const after = { ...before, ...outcome.focus };
      commit({
        type: "apply",
        keymap: outcome.keymap,
        before,
        after,
        coalesce: options?.coalesce,
      });
      navigate(after);

      // An Undo toast only makes sense for the latest change
      toast.dismiss(undoToast.current);
      undoToast.current = outcome.undoToast
        ? toast(outcome.undoToast, { action: { label: "Undo", onClick: undo } })
        : undefined;
    },
    [commit, latest, navigate, undo],
  );

  // Press a key on the pad: show it on the layer the pad is on
  useDeviceKeySelection(connected && selectByPressing, (pos) =>
    navigate({
      layer: live.current.hostLayer ?? latest().focus.layer,
      selected: pos,
    }),
  );

  useDesignerShortcuts({
    undo,
    redo: state.redo,
    setLayer: state.setLayer,
    layerIds: () => {
      const present = latest().history.present;
      return present ? layerIds(present.keymap) : [];
    },
  });

  /** Save pending edits, run a profile change, then load the result. */
  const changeProfile = useCallback(
    async (work: () => Promise<unknown>) => {
      await flush();
      await work();
      await load();
    },
    [flush, load],
  );

  const { activate, ...profileMenu } = profileActions({
    profile: profile?.name ?? DEFAULT_PROFILE,
    flush,
    change: changeProfile,
  });

  const confirmDuplicate = async (name: string) => {
    await activate(name, { from: live.current.profile?.name });
    setDuplicatePrompt(null);
    const pending = pendingEdit.current;
    pendingEdit.current = null;
    if (pending) edit(pending.op, pending.options);
  };

  const value: DesignerContextValue = {
    profiles,
    profile,
    keymap,
    loadError,
    retryLoad: () => void load(),
    layer: focus.layer,
    selected: focus.selected,
    setLayer: state.setLayer,
    select: state.select,
    edit,
    undo,
    redo: state.redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    save: autosave.state,
    retrySave,
    device: { connected, pressed, hostLayer },
    selectByPressing,
    setSelectByPressing,
    duplicatePrompt,
    confirmDuplicate,
    cancelDuplicate: () => {
      pendingEdit.current = null;
      setDuplicatePrompt(null);
    },
    ...profileMenu,
  };

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}
