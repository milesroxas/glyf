import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ProfileList } from "../../entities/keymap";
import { unlistenAll } from "../../shared/lib/listeners";
import {
  listProfiles,
  onKeymapChanged,
  onPanelShown,
  setActiveProfile,
} from "../../shared/lib/tauri";
import { PanelHeading, PanelRow, PanelSeparator } from "./PanelRow";

/**
 * The profiles, the active one checked. A click switches the pad at once.
 * Hidden until there is more than one to choose from.
 */
export function ProfileSection() {
  const [list, setList] = useState<ProfileList | null>(null);

  const load = useCallback(() => {
    listProfiles().then(setList, () => {});
  }, []);

  useEffect(() => {
    const listeners = [onKeymapChanged(load), onPanelShown(load)];
    load();
    return () => unlistenAll(listeners);
  }, [load]);

  if (!list || list.profiles.length < 2) return null;

  const choose = (name: string) => {
    // The check moves now; the engine follows in a moment
    setList({ ...list, active: name });
    setActiveProfile(name).catch(load);
  };

  return (
    <>
      <PanelSeparator />
      <PanelHeading>Profile</PanelHeading>
      <div
        role="radiogroup"
        aria-label="Profile"
        className="max-h-[8.75rem] overflow-y-auto"
      >
        {list.profiles.map(({ name }) => {
          const active = name === list.active;
          return (
            <PanelRow
              key={name}
              role="radio"
              aria-checked={active}
              onClick={() => active || choose(name)}
            >
              <Check
                aria-hidden
                strokeWidth={2.5}
                className={
                  active ? "size-3.5 text-primary" : "invisible size-3.5"
                }
              />
              <span className="min-w-0 flex-1 truncate">{name}</span>
            </PanelRow>
          );
        })}
      </div>
    </>
  );
}
