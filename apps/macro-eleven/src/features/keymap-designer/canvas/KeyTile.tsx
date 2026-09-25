import { formatShortcut } from "@glyf/keymap-schema";
import { Layers, ListOrdered, Plus, Puzzle } from "lucide-react";
import { actionKind, actionLabel, spokenKey } from "../../../entities/action";
import { findApp, type InstalledApp } from "../../../entities/app";
import type { Action, Keymap, MatrixPosition } from "../../../entities/keymap";
import { cn } from "../../../shared/lib/utils";
import { Keycap } from "../../../shared/ui/Keycap";
import { AppIcon } from "../apps/AppIcon";

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

function TileMark({
  action,
  apps,
}: {
  action: Action;
  apps: readonly InstalledApp[] | null;
}) {
  switch (action.action) {
    case "launch_app":
      return (
        <AppIcon
          app={apps ? findApp(apps, action) : undefined}
          className="size-4"
        />
      );
    case "shortcut":
      return (
        <span className="truncate text-[10px] leading-4 font-medium tracking-wide text-muted-foreground">
          {formatShortcut(action.keys).join(" ")}
        </span>
      );
    default:
      return null;
  }
}

const KIND_GLYPHS = { layer: Layers, macro: ListOrdered, plugin: Puzzle };

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
  const kind = actionKind(action);
  const Glyph =
    kind in KIND_GLYPHS ? KIND_GLYPHS[kind as keyof typeof KIND_GLYPHS] : null;
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
        className="group flex h-full w-full flex-col justify-between overflow-hidden p-2 text-left outline-none"
      >
        {action ? (
          <>
            <span className="flex h-4 min-w-0 items-center">
              <TileMark action={action} apps={apps} />
            </span>
            <span
              className={cn(
                "line-clamp-2 pr-3 text-[11px] leading-tight font-medium tracking-[0.01em]",
                kind === "plugin" && "text-muted-foreground",
              )}
            >
              {actionLabel(action, keymap)}
            </span>
            {Glyph && (
              <Glyph
                aria-hidden
                className="absolute right-1.5 bottom-1.5 size-2.5 text-muted-foreground"
              />
            )}
          </>
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
