import { AnimatePresence, motion } from "motion/react";
import { overallProgress } from "../../entities/firmware";
import { LABEL_SWAP, POP } from "../../shared/lib/motion";
import { SidebarBadge } from "../../shared/ui/sidebar";
import { useFirmwareUpdate } from "./FirmwareUpdateProvider";

const MotionBadge = motion.create(SidebarBadge);

/**
 * The Firmware row's badge: "Update" while one is available, then the
 * percentage while it installs. It pops in when an update turns up, and
 * the percentage counts up in place.
 */
export function FirmwareBadge() {
  const { status, update } = useFirmwareUpdate();
  const label =
    update.kind === "running"
      ? `${Math.round((update.progress ? overallProgress(update.progress) : 0) * 100)}%`
      : update.kind === "idle" && status?.updateAvailable
        ? "Update"
        : null;

  return (
    <AnimatePresence initial={false}>
      {label && (
        <MotionBadge
          key="badge"
          {...POP}
          className="relative"
          aria-label={
            update.kind === "running"
              ? `Updating, ${label}`
              : "A firmware update is available"
          }
        >
          {/* A word swap cross-fades; a new percentage just replaces the last */}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={update.kind}
              {...LABEL_SWAP}
              className="min-w-[3ch] text-center"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </MotionBadge>
      )}
    </AnimatePresence>
  );
}
