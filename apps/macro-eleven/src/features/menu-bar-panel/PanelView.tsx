import { formatShortcut } from "@glyf/keymap-schema";
import { CircleArrowUp, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { FirmwareStatus } from "../../entities/firmware";
import type { Backdrop } from "../../entities/settings";
import { unlistenAll } from "../../shared/lib/listeners";
import {
  fitPanel,
  getBackdrop,
  getFirmwareStatus,
  hidePanel,
  onPanelShown,
  openAccessibilitySettings,
  quitApp,
  setOverlayVisible,
  showMainWindow,
  showSettingsWindow,
} from "../../shared/lib/tauri";
import { useAccessibilityPermission } from "../../shared/lib/useAccessibilityPermission";
import { useActiveKeymap } from "../../shared/lib/useActiveKeymap";
import { useDeviceStatus } from "../../shared/lib/useDeviceStatus";
import { useFitToContent } from "../../shared/lib/useFitToContent";
import { useInstalledApps } from "../../shared/lib/useInstalledApps";
import { useKeyEvents } from "../../shared/lib/useKeyEvents";
import { usePageVisible } from "../../shared/lib/usePageVisible";
import { usePotValue } from "../../shared/lib/usePotValue";
import { useSettings } from "../../shared/lib/useSettings";
import { Switch } from "../../shared/ui/switch";
import { CloseTip } from "./CloseTip";
import { PadModule } from "./PadModule";
import { PanelRow, PanelSeparator } from "./PanelRow";
import { ProfileSection } from "./ProfileSection";

/** Strong ease-out (`--ease-out`). */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Arrow keys move between items, as in a menu. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
  if (!step && event.key !== "Home" && event.key !== "End") return;
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-panel-item]:not(:disabled)",
    ),
  ];
  if (!items.length) return;
  event.preventDefault();
  const current = items.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : current === -1
          ? step > 0
            ? 0
            : items.length - 1
          : (current + step + items.length) % items.length;
  items[next]?.focus();
}

/**
 * The menu bar panel: the pad at a glance, then the few things worth one
 * click (profile, overlay), then the way out. It drops from the menu bar
 * icon; the host fades the window, the content settles toward the icon.
 */
export function PanelView() {
  const root = useRef<HTMLDivElement | null>(null);
  const fit = useFitToContent<HTMLDivElement>((height) => {
    fitPanel(height).catch(() => {});
  });
  const reduceMotion = useReducedMotion();
  const visible = usePageVisible();
  const [tip, setTip] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>("glass");
  const [firmware, setFirmware] = useState<FirmwareStatus | null>(null);
  const overlaySwitch = useId();

  const { keys, layer } = useKeyEvents();
  const { keymap, error } = useActiveKeymap();
  const { apps } = useInstalledApps();
  const { value: potValue } = usePotValue();
  const connected = useDeviceStatus() === "connected";
  const { settings } = useSettings();
  const accessibility = useAccessibilityPermission(visible);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    getBackdrop("panel").then(setBackdrop, () => {});
  }, []);

  useEffect(() => {
    const listeners = [
      onPanelShown(({ tip, backdrop }) => {
        setTip(tip);
        setBackdrop(backdrop);
        getFirmwareStatus().then(setFirmware, () => setFirmware(null));
        const node = root.current;
        if (!node) return;
        node.scrollTop = 0;
        node.focus({ preventScroll: true });
        // Settle toward the icon while the window fades in
        if (!reduceMotion) {
          node.animate?.(
            [
              { transform: "translateY(-6px) scale(0.985)" },
              { transform: "none" },
            ],
            { duration: 260, easing: EASE_OUT },
          );
        }
      }),
    ];
    return () => unlistenAll(listeners);
  }, [reduceMotion]);

  const act = (run: () => Promise<unknown>) => () => {
    run().catch((error) => console.error(error));
  };

  const shortcut = settings?.overlayShortcut.length
    ? formatShortcut(settings.overlayShortcut).join(" ")
    : undefined;

  return (
    <div
      ref={(node) => {
        root.current = node;
        fit(node);
      }}
      role="dialog"
      aria-label="Macro Eleven"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          hidePanel();
          return;
        }
        if (event.metaKey && event.key === ",") {
          event.preventDefault();
          showSettingsWindow();
          return;
        }
        if (event.metaKey && event.key.toLowerCase() === "q") {
          event.preventDefault();
          quitApp();
          return;
        }
        moveFocus(event);
      }}
      data-backdrop={backdrop}
      className="panel-surface w-full self-start origin-top p-1.5 text-foreground outline-none select-none"
    >
      <header className="flex h-8 items-center justify-between gap-3 px-2.5">
        <h1 className="text-[13px] font-semibold tracking-[-0.005em]">
          Macro Eleven
        </h1>
        <span
          role="status"
          className="flex items-center gap-1.5 text-[12px] text-foreground/65"
        >
          <span
            aria-hidden
            className={
              connected
                ? "size-1.5 rounded-full bg-primary"
                : "size-1.5 rounded-full bg-foreground/35"
            }
          />
          {connected ? "Connected" : "Not connected"}
        </span>
      </header>

      <AnimatePresence initial={false}>
        {tip && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden px-0.5"
          >
            <CloseTip onDone={() => setTip(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-0.5">
        <PadModule
          keymap={keymap}
          error={error}
          layer={layer}
          keys={keys}
          potValue={potValue}
          connected={connected}
          apps={apps}
        />
      </div>

      {accessibility === false && (
        <PanelRow
          className="mt-1.5 h-auto items-start py-2"
          onClick={act(openAccessibilitySettings)}
        >
          <TriangleAlert
            aria-hidden
            className="mt-px size-4 shrink-0 text-warning"
          />
          <span className="min-w-0">
            <span className="block">Allow Accessibility Access…</span>
            <span className="block text-[12px] text-muted-foreground">
              Shortcuts and macros need it to reach other apps.
            </span>
          </span>
        </PanelRow>
      )}

      {firmware?.updateAvailable && (
        <PanelRow
          className="mt-1.5 h-auto items-start py-2"
          onClick={act(() => showMainWindow("/firmware"))}
        >
          <CircleArrowUp
            aria-hidden
            className="mt-px size-4 shrink-0 text-foreground/70"
          />
          <span className="min-w-0">
            <span className="block">Update Firmware…</span>
            <span className="block text-[12px] text-muted-foreground">
              Version {firmware.bundledVersion} is ready to install.
            </span>
          </span>
        </PanelRow>
      )}

      <ProfileSection />

      <PanelSeparator />
      {settings && (
        <div className="flex h-7 items-center gap-2.5 rounded-[7px] px-2.5 text-[13px] hover:bg-[var(--glass-hover)]">
          <label
            htmlFor={overlaySwitch}
            className="flex-1 self-stretch leading-7"
          >
            Show Overlay
          </label>
          {shortcut && (
            <kbd className="font-sans text-[12px] tracking-[0.08em] text-muted-foreground">
              {shortcut}
            </kbd>
          )}
          <Switch
            id={overlaySwitch}
            data-panel-item
            checked={settings.overlayVisible}
            onCheckedChange={(visible) => {
              setOverlayVisible(visible).catch(() => {});
            }}
          />
        </div>
      )}

      <PanelSeparator />
      <PanelRow onClick={act(() => showMainWindow())}>Open Designer</PanelRow>
      <PanelRow shortcut="⌘," onClick={act(showSettingsWindow)}>
        Settings…
      </PanelRow>
      <PanelRow shortcut="⌘Q" onClick={act(quitApp)}>
        Quit Macro Eleven
      </PanelRow>
    </div>
  );
}
