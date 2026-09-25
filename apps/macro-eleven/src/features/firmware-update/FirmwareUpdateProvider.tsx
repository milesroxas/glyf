import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  FirmwareProgressEvent,
  FirmwareStatus,
} from "../../entities/firmware";
import {
  getFirmwareStatus,
  onDeviceStatus,
  onFirmwareProgress,
  updateFirmware,
} from "../../shared/lib/tauri";

/** Rechecks for a plugged-in device, or one waiting in its bootloader. */
const STATUS_POLL_MS = 3000;

type UpdateResult =
  | { kind: "idle" }
  | { kind: "running"; progress: FirmwareProgressEvent | null }
  | { kind: "succeeded"; version: string }
  | { kind: "failed"; error: string };

interface FirmwareUpdateContextValue {
  status: FirmwareStatus | null;
  /** Set when the bundled firmware can't be read. */
  statusError: string | null;
  update: UpdateResult;
  startUpdate: () => Promise<void>;
  dismissResult: () => void;
}

const FirmwareUpdateContext = createContext<FirmwareUpdateContextValue | null>(
  null,
);

export function useFirmwareUpdate() {
  const context = useContext(FirmwareUpdateContext);
  if (!context) {
    throw new Error(
      "useFirmwareUpdate must be used inside FirmwareUpdateProvider",
    );
  }
  return context;
}

export function FirmwareUpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FirmwareStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateResult>({ kind: "idle" });
  const running = update.kind === "running";

  const refresh = useCallback(async () => {
    try {
      setStatus(await getFirmwareStatus());
      setStatusError(null);
    } catch (error) {
      setStatusError(String(error));
    }
  }, []);

  useEffect(() => {
    if (running) return;
    refresh();
    const interval = setInterval(refresh, STATUS_POLL_MS);
    const unlisten = onDeviceStatus(() => refresh());
    return () => {
      clearInterval(interval);
      unlisten.then((fn) => fn());
    };
  }, [refresh, running]);

  useEffect(() => {
    const unlisten = onFirmwareProgress((progress) => {
      setUpdate((current) =>
        current.kind === "running" ? { kind: "running", progress } : current,
      );
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const startUpdate = useCallback(async () => {
    setUpdate({ kind: "running", progress: null });
    try {
      const info = await updateFirmware();
      setUpdate({ kind: "succeeded", version: info.version });
    } catch (error) {
      setUpdate({ kind: "failed", error: String(error) });
    }
  }, []);

  const dismissResult = useCallback(() => setUpdate({ kind: "idle" }), []);

  return (
    <FirmwareUpdateContext.Provider
      value={{ status, statusError, update, startUpdate, dismissResult }}
    >
      {children}
    </FirmwareUpdateContext.Provider>
  );
}
