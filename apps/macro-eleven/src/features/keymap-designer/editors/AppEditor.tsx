import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { findApp, type InstalledApp } from "../../../entities/app";
import type {
  LaunchAppAction,
  MatrixPositionKey,
} from "../../../entities/keymap";
import { useInstalledApps } from "../../../shared/lib/useInstalledApps";
import { AppIcon } from "../../../shared/ui/AppIcon";
import { Switch } from "../../../shared/ui/switch";
import { AppPicker } from "../apps/AppPicker";
import { Field, Warning } from "./Field";

interface AppEditorProps {
  /** Undefined while the key is becoming an app key. */
  action: LaunchAppAction | undefined;
  onChoose: (app: InstalledApp) => void;
  onDropOnKey: (pos: MatrixPositionKey, app: InstalledApp) => void;
  onChange: (action: LaunchAppAction) => void;
}

export function AppEditor({
  action,
  onChoose,
  onDropOnKey,
  onChange,
}: AppEditorProps) {
  const { apps } = useInstalledApps();
  const [open, setOpen] = useState(false);
  const [isNew] = useState(!action);

  // A new app key opens the picker, a frame late: the click that picked the
  // App kind would take focus back and close it as it opens
  useEffect(() => {
    if (!isNew) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [isNew]);
  const installed = action && apps ? findApp(apps, action) : undefined;
  const missing = Boolean(action && apps && !installed);

  return (
    <div className="grid gap-4">
      <Field label="App">
        <AppPicker
          open={open}
          onOpenChange={setOpen}
          onSelect={onChoose}
          onDropOnKey={onDropOnKey}
        >
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-input bg-input/30 px-2.5 text-left shadow-xs transition-colors outline-none hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            {action ? (
              <>
                <AppIcon app={installed} className="size-7" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {action.app}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {action.bundleId ?? "Opens by name"}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">
                Choose an app…
              </span>
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </AppPicker>
      </Field>
      {missing && action && (
        <Warning>{action.app} is not installed on this Mac.</Warning>
      )}
      {action && (
        // biome-ignore lint/a11y/noLabelWithoutControl: the switch is the control
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Bring to front
            <span className="block text-xs text-muted-foreground">
              Off opens the app in the background.
            </span>
          </span>
          <Switch
            checked={action.focusIfRunning ?? true}
            onCheckedChange={(focus) => {
              const { focusIfRunning: _previous, ...rest } = action;
              onChange(focus ? rest : { ...rest, focusIfRunning: false });
            }}
          />
        </label>
      )}
    </div>
  );
}
