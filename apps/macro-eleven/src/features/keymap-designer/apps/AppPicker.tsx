import { Command } from "cmdk";
import { FolderOpen, RotateCw } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type InstalledApp, rankApps } from "../../../entities/app";
import type { MatrixPositionKey } from "../../../entities/keymap";
import { pickAppFromFile } from "../../../shared/lib/tauri";
import { useInstalledApps } from "../../../shared/lib/useInstalledApps";
import { AppIcon } from "../../../shared/ui/AppIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../shared/ui/popover";
import { Tooltip } from "../../../shared/ui/tooltip";
import { useDragToKey } from "./DragToKey";
import { recentApps, rememberApp } from "./recentApps";

interface AppPickerProps {
  /** The button that opens the picker. */
  children: ReactNode;
  onSelect: (app: InstalledApp) => void;
  /** When set, rows can be dragged onto keys. */
  onDropOnKey?: (pos: MatrixPositionKey, app: InstalledApp) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

function AppRow({
  app,
  onChoose,
  onDropOnKey,
}: {
  app: InstalledApp;
  onChoose: (app: InstalledApp) => void;
  onDropOnKey?: AppPickerProps["onDropOnKey"];
}) {
  const { begin } = useDragToKey();
  const dragged = useRef<() => boolean>(() => false);
  return (
    <Command.Item
      value={app.bundleId}
      onSelect={() => {
        if (!dragged.current()) onChoose(app);
      }}
      onPointerDown={
        onDropOnKey
          ? (event) => {
              dragged.current = begin(event, app, onDropOnKey);
            }
          : undefined
      }
      className="flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 select-none data-[selected=true]:bg-accent"
    >
      <AppIcon app={app} className="size-6" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{app.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {app.bundleId}
        </span>
      </span>
    </Command.Item>
  );
}

/**
 * Searchable list of installed apps with their icons, recently used first.
 * Opens from its trigger; "Other…" picks any app bundle from disk.
 */
export function AppPicker({
  children,
  onSelect,
  onDropOnKey,
  open: controlledOpen,
  onOpenChange,
}: AppPickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [query, setQuery] = useState("");
  const { apps, refresh } = useInstalledApps();

  const ranked = useMemo(
    () => (apps ? rankApps(apps, query, recentApps()) : []),
    [apps, query],
  );

  const choose = (app: InstalledApp) => {
    rememberApp(app.bundleId);
    onSelect(app);
    setOpen(false);
    setQuery("");
  };

  const chooseFromDisk = async () => {
    try {
      const app = await pickAppFromFile();
      if (app) choose(app);
    } catch (error) {
      toast.error(String(error));
    }
  };

  const drop =
    onDropOnKey &&
    ((pos: MatrixPositionKey, app: InstalledApp) => {
      rememberApp(app.bundleId);
      onDropOnKey(pos, app);
      setOpen(false);
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command shouldFilter={false} label="Apps" loop>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search apps"
            className="h-10 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {apps === null ? (
              <Command.Loading label="Loading apps">
                {SKELETON_ROWS.map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-2.5 px-2 py-1.5"
                  >
                    <div className="size-6 animate-pulse rounded-md bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </Command.Loading>
            ) : (
              <>
                <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No apps match “{query}”
                </Command.Empty>
                {ranked.map((app) => (
                  <AppRow
                    key={app.bundleId}
                    app={app}
                    onChoose={choose}
                    onDropOnKey={drop}
                  />
                ))}
              </>
            )}
          </Command.List>
          <div className="flex items-center justify-between border-t p-1">
            <button
              type="button"
              onClick={chooseFromDisk}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <FolderOpen className="size-4" />
              Other…
            </button>
            <Tooltip content="Look for newly installed apps">
              <button
                type="button"
                onClick={refresh}
                aria-label="Refresh the app list"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <RotateCw className="size-3.5" />
              </button>
            </Tooltip>
          </div>
        </Command>
        {onDropOnKey && (
          <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            Tip: drag an app onto any key.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
