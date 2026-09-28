import { AnimatePresence, motion } from "motion/react";
import { LABEL_SWAP } from "../../shared/lib/motion";
import { cn } from "../../shared/lib/utils";
import { PadGlyph } from "../../shared/ui/icons";
import { SIDEBAR_WELL, SidebarWellText } from "../../shared/ui/sidebar";
import { useDevice } from "../providers";

/**
 * The pad, at the foot of the sidebar where macOS keeps accounts and
 * devices. It is the window's only connection status. When the pad
 * connects, its dot lights with a single ring.
 */
export function DeviceCard() {
  const { status } = useDevice();
  const connected = status === "connected";

  return (
    <div
      title={
        connected
          ? undefined
          : "Plug in Macro Eleven over USB. The app connects automatically."
      }
      className={cn(SIDEBAR_WELL, "mt-2")}
    >
      <PadGlyph />
      <SidebarWellText title="Macro Eleven" role="status" className="relative">
        <span
          // Remounts on each change, so the ring plays once per connect
          key={status}
          className={cn(
            "relative size-1.5 shrink-0 rounded-full",
            connected ? "live-ring bg-primary" : "bg-muted-foreground",
          )}
        />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={status} {...LABEL_SWAP}>
            {connected ? "Connected" : "Not connected"}
          </motion.span>
        </AnimatePresence>
      </SidebarWellText>
    </div>
  );
}
