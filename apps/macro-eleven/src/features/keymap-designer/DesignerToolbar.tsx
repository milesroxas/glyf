import { autoSwitchLayers, setAutoSwitchLayers } from "@glyf/keymap-schema";
import { Check, Redo2, TriangleAlert, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CROSSFADE } from "../../shared/lib/motion";
import { Button } from "../../shared/ui/button";
import { Kbd } from "../../shared/ui/kbd";
import { Switch } from "../../shared/ui/switch";
import { Tooltip } from "../../shared/ui/tooltip";
import { LayerTabs } from "./layers/LayerTabs";
import { useDesigner, useKeymap } from "./model/KeymapProvider";
import { ProfileMenu } from "./profiles/ProfileMenu";

/** How long "Saved" stays after a save. */
const SAVED_VISIBLE_MS = 1200;

/** "Saved" after each autosave, then it fades; a failed save stays. */
function SaveStatus() {
  const { save, retrySave } = useDesigner();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // A failed save also stays in a toast until it is retried or dismissed
  useEffect(() => {
    if (save.status !== "error") return;
    const id = toast.error("Could not save your changes", {
      description: save.message,
      duration: Number.POSITIVE_INFINITY,
      action: { label: "Retry", onClick: retrySave },
    });
    return () => void toast.dismiss(id);
  }, [save, retrySave]);

  useEffect(() => {
    if (save.status !== "saved") return;
    setSavedAt(save.at);
    const timer = setTimeout(() => setSavedAt(null), SAVED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [save]);

  return (
    <div role="status" aria-live="polite" className="min-w-20 text-xs">
      <AnimatePresence mode="wait" initial={false}>
        {save.status === "error" ? (
          <motion.button
            key="error"
            type="button"
            onClick={retrySave}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CROSSFADE}
            className="flex items-center gap-1 rounded px-1 text-destructive hover:underline"
          >
            <TriangleAlert className="size-3.5" />
            Not saved. Retry
          </motion.button>
        ) : (
          savedAt !== null && (
            <motion.span
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              transition={CROSSFADE}
              className="flex items-center gap-1 text-muted-foreground"
            >
              <Check className="size-3.5" />
              Saved
            </motion.span>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryButtons() {
  const { undo, redo, canUndo, canRedo } = useDesigner();
  return (
    <div className="flex items-center">
      <Tooltip
        content={
          <>
            Undo{" "}
            <Kbd className="ml-1 h-4 border-0 bg-background/20 text-background">
              ⌘Z
            </Kbd>
          </>
        }
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          aria-disabled={!canUndo}
          onClick={undo}
          className={canUndo ? undefined : "opacity-40"}
        >
          <Undo2 />
        </Button>
      </Tooltip>
      <Tooltip
        content={
          <>
            Redo{" "}
            <Kbd className="ml-1 h-4 border-0 bg-background/20 text-background">
              ⇧⌘Z
            </Kbd>
          </>
        }
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          aria-disabled={!canRedo}
          onClick={redo}
          className={canRedo ? undefined : "opacity-40"}
        >
          <Redo2 />
        </Button>
      </Tooltip>
    </div>
  );
}

/** Switch layers as apps come to the front. A setting of the whole profile. */
function FollowFrontApp() {
  const keymap = useKeymap();
  const { edit } = useDesigner();
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the switch is the control
    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      Follow the front app
      <Switch
        checked={autoSwitchLayers(keymap)}
        onCheckedChange={(enabled) =>
          edit((km) => setAutoSwitchLayers(km, enabled))
        }
      />
    </label>
  );
}

/**
 * The profile row (name, save status, profile settings, undo), then the
 * layer tabs, which get the full width.
 */
export function DesignerToolbar() {
  return (
    <div className="material sticky top-0 z-10 border-b">
      <div className="flex h-12 items-center gap-2 px-3">
        <ProfileMenu />
        <SaveStatus />
        <div className="ml-auto flex items-center gap-3">
          <FollowFrontApp />
          <div className="h-4 w-px bg-border" />
          <HistoryButtons />
        </div>
      </div>
      <div className="flex h-11 items-center px-3">
        <LayerTabs />
      </div>
    </div>
  );
}
