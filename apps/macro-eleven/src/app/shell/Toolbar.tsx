import { PictureInPicture2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMatch } from "react-router-dom";
import {
  DesignerActions,
  DesignerTitle,
} from "../../features/keymap-designer/DesignerToolbar";
import { useDesigner } from "../../features/keymap-designer/model/KeymapProvider";
import { FADE } from "../../shared/lib/motion";
import { setOverlayVisible } from "../../shared/lib/tauri";
import { useSettings } from "../../shared/lib/useSettings";
import { cn } from "../../shared/lib/utils";
import { ToolbarCapsule } from "../../shared/ui/toolbar";
import { Tooltip } from "../../shared/ui/tooltip";
import { DESIGNER_PATH } from "../pages";

/** Shows or hides the pad overlay; its icon is lit while the overlay is up. */
function OverlayToggle() {
  const { settings } = useSettings();
  const on = settings?.overlayVisible ?? false;
  return (
    <Tooltip
      side="bottom"
      content={on ? "Hide the overlay" : "Show the overlay"}
    >
      <ToolbarCapsule aria-pressed={on} onClick={() => setOverlayVisible(!on)}>
        <PictureInPicture2
          aria-hidden
          strokeWidth={1.9}
          className={cn(
            "transition-colors duration-200",
            on ? "text-primary" : "text-foreground/90",
          )}
        />
        Overlay
      </ToolbarCapsule>
    </Tooltip>
  );
}

/**
 * The toolbar floats over the content column; its empty space drags the
 * window. Its title and capsules sit on the content column's gutter. On the designer it names the layer on screen and holds undo and
 * redo; the overlay switch is there on every page.
 */
export function Toolbar() {
  const { keymap } = useDesigner();
  const designer = useMatch(DESIGNER_PATH) !== null && keymap !== null;

  return (
    <header
      data-tauri-drag-region
      className="absolute inset-x-0 top-0 z-30 flex h-toolbar items-center gap-3 px-gutter"
    >
      <AnimatePresence initial={false}>
        {designer && (
          <motion.div
            key="title"
            data-tauri-drag-region
            {...FADE}
            className="flex min-w-0 flex-1"
          >
            <DesignerTitle />
          </motion.div>
        )}
      </AnimatePresence>
      <div
        data-tauri-drag-region
        className="ml-auto flex shrink-0 items-center gap-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {designer && (
            <motion.div
              key="actions"
              {...FADE}
              className="flex items-center gap-2"
            >
              <DesignerActions />
            </motion.div>
          )}
        </AnimatePresence>
        <OverlayToggle />
      </div>
    </header>
  );
}
