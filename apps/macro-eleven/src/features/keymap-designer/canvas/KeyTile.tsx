import { Plus } from "lucide-react";
import { keyFace, spokenKey } from "../../../entities/action";
import type { InstalledApp } from "../../../entities/app";
import type { Action, Keymap, MatrixPosition } from "../../../entities/keymap";
import { Keycap } from "../../../shared/ui/Keycap";
import { KeyLegend } from "../../../shared/ui/KeyLegend";

interface KeyTileProps {
  position: MatrixPosition;
  action: Action | undefined;
  keymap: Keymap;
  apps: readonly InstalledApp[] | null;
  selected: boolean;
  /** Held down on the pad right now. */
  pressed: boolean;
  dropTarget: boolean;
  /** In the tab order (one key at a time; arrows move between keys). */
  tabbable: boolean;
  onSelect: () => void;
}

/** A key on the canvas: a keycap button showing what the key does. */
export function KeyTile({
  position,
  action,
  keymap,
  apps,
  selected,
  pressed,
  dropTarget,
  tabbable,
  onSelect,
}: KeyTileProps) {
  return (
    <Keycap
      asChild
      interactive
      pressed={pressed}
      empty={!action}
      dropTarget={dropTarget}
    >
      <button
        type="button"
        data-key-pos={`${position.row},${position.col}`}
        tabIndex={tabbable ? 0 : -1}
        aria-pressed={selected}
        aria-label={spokenKey(position, action, keymap)}
        // Select on pointer-down, not on release. WebKit does not focus
        // buttons on click, so focus by hand for the arrow keys.
        onPointerDown={(event) => {
          onSelect();
          event.currentTarget.focus();
        }}
        onFocus={onSelect}
        className="group flex h-full w-full overflow-hidden outline-none"
      >
        {action ? (
          <KeyLegend face={keyFace(action, keymap, apps)} />
        ) : (
          <Plus
            aria-hidden
            className="m-auto size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-60 group-focus-visible:opacity-60"
          />
        )}
      </button>
    </Keycap>
  );
}
