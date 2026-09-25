/**
 * Firmware entity - device firmware version and update lifecycle
 */

/** What is on the USB bus, from the updater's point of view. */
export type FirmwareDeviceMode =
  | "disconnected"
  /** Running firmware. */
  | "ready"
  /** An RP2040 is waiting in its USB bootloader (interrupted update, or entered by hand). */
  | "bootloader"
  | "updating";

export interface FirmwareStatus {
  mode: FirmwareDeviceMode;
  /** Installed version. Null when unknown: disconnected, or firmware older than 1.1.0. */
  version: string | null;
  /** Version bundled with this app. */
  bundledVersion: string;
  updateAvailable: boolean;
}

export type FirmwareUpdateStage =
  | "entering-bootloader"
  /** Firmware older than 1.1.0 can't reboot itself: the user holds HOME for 2 seconds. */
  | "waiting-for-bootloader"
  | "writing"
  | "verifying"
  | "restarting"
  | "done";

export interface FirmwareProgressEvent {
  stage: FirmwareUpdateStage;
  /** Completion of the current stage, 0-1. */
  fraction: number;
}

export interface FirmwareInfo {
  protocol: number;
  version: string;
}

export const FIRMWARE_STAGE_LABELS: Record<FirmwareUpdateStage, string> = {
  "entering-bootloader": "Rebooting into update mode",
  "waiting-for-bootloader": "Hold the top-left key for 2 seconds",
  writing: "Writing firmware",
  verifying: "Verifying",
  restarting: "Restarting",
  done: "Done",
};

/** Share of the overall progress bar each stage covers, as [start, end]. */
const STAGE_RANGES: Record<FirmwareUpdateStage, [number, number]> = {
  "entering-bootloader": [0, 0.05],
  "waiting-for-bootloader": [0.05, 0.05],
  writing: [0.05, 0.75],
  verifying: [0.75, 0.9],
  restarting: [0.9, 0.98],
  done: [1, 1],
};

export function overallProgress({ stage, fraction }: FirmwareProgressEvent) {
  const [start, end] = STAGE_RANGES[stage];
  return start + (end - start) * Math.min(Math.max(fraction, 0), 1);
}
