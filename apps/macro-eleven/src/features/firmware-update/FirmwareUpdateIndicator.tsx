import { CircleArrowUp, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { overallProgress } from "../../entities/firmware";
import { useFirmwareUpdate } from "./FirmwareUpdateProvider";

/** Header shortcut to the firmware page while an update is available or running. */
export function FirmwareUpdateIndicator() {
  const { status, update } = useFirmwareUpdate();

  if (update.kind === "running") {
    const percent = update.progress
      ? Math.round(overallProgress(update.progress) * 100)
      : 0;
    return (
      <Link
        to="/firmware"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
      >
        <LoaderCircle className="size-3 animate-spin" />
        Updating {percent}%
      </Link>
    );
  }

  if (!status?.updateAvailable || update.kind !== "idle") {
    return null;
  }

  return (
    <Link
      to="/firmware"
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <CircleArrowUp className="size-3" />
      Update available
    </Link>
  );
}
