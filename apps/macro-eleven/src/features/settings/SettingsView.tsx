import { Settings as Gear, PictureInPicture2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { useEffect, useId } from "react";
import { SPRING } from "../../shared/lib/motion";
import { useStoredState } from "../../shared/lib/storage";
import { fitSettingsWindow, setWindowTitle } from "../../shared/lib/tauri";
import { useFitToContent } from "../../shared/lib/useFitToContent";
import { useSettings } from "../../shared/lib/useSettings";
import { cn } from "../../shared/lib/utils";
import { GeneralPane } from "./GeneralPane";
import { OverlayPane } from "./OverlayPane";

const PANES = [
  { id: "general", label: "General", icon: Gear },
  { id: "overlay", label: "Overlay", icon: PictureInPicture2 },
] as const;

type PaneId = (typeof PANES)[number]["id"];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * The Settings window, as Mac apps have it: the pane's name in the title
 * bar, a toolbar of panes, and grouped rows. Changes apply at once. The
 * window takes each pane's height, its top edge still, while the panes
 * cross-fade.
 */
export function SettingsView() {
  const [stored, setPane] = useStoredState<PaneId>(
    "macro11.settings.pane",
    "general",
  );
  const pane = PANES.find((p) => p.id === stored) ?? PANES[0];
  const { settings, update } = useSettings();
  const fit = useFitToContent<HTMLDivElement>((height) => {
    fitSettingsWindow(height).catch(() => {});
  });
  const indicator = useId();

  useEffect(() => {
    setWindowTitle(pane.label).catch(() => {});
  }, [pane.label]);

  // Measured only once there is something to show, so the window opens at
  // its real height
  if (!settings) return null;

  return (
    <TabsPrimitive.Root
      ref={fit}
      value={pane.id}
      onValueChange={(next) => setPane(next as PaneId)}
      className="flex w-full flex-col self-start bg-background select-none"
    >
      <header data-tauri-drag-region className="border-b border-border pb-2">
        {/* The title bar: the window buttons sit over its left end */}
        <h1
          data-tauri-drag-region
          className="flex h-7 items-center justify-center text-[13px] font-semibold text-foreground/90"
        >
          {pane.label}
        </h1>
        <TabsPrimitive.List
          aria-label="Settings"
          data-tauri-drag-region
          className="flex justify-center gap-1"
        >
          {PANES.map(({ id, label, icon: Icon }) => (
            <TabsPrimitive.Trigger
              key={id}
              value={id}
              className={cn(
                "group relative flex h-12 w-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground outline-none transition-colors duration-150",
                "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=active]:text-foreground",
              )}
            >
              {id === pane.id && (
                <motion.span
                  layoutId={indicator}
                  transition={SPRING}
                  className="absolute inset-0 rounded-lg bg-foreground/[0.08]"
                />
              )}
              <Icon
                aria-hidden
                strokeWidth={1.75}
                className="relative size-5 transition-transform duration-150 ease-(--ease-out) group-active:scale-95"
              />
              <span className="relative text-[11px] leading-none font-medium">
                {label}
              </span>
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </header>

      <div className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          <TabsPrimitive.Content
            key={pane.id}
            value={pane.id}
            forceMount
            asChild
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0.18, delay: 0.04, ease: EASE_OUT },
              }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="w-full px-6 pt-5 pb-6 outline-none"
            >
              {pane.id === "general" ? (
                <GeneralPane settings={settings} update={update} />
              ) : (
                <OverlayPane settings={settings} update={update} />
              )}
            </motion.div>
          </TabsPrimitive.Content>
        </AnimatePresence>
      </div>
    </TabsPrimitive.Root>
  );
}
