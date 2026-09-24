import { useCallback, useEffect, useRef, useState } from "react";
import { useDevice } from "../../app/providers";
import type { DeviceDebugSnapshot } from "../../entities/device";
import {
  DEFAULT_DISPLAY_CONFIG,
  type DisplayConfig,
} from "../../entities/display";
import {
  fillDisplay,
  getDeviceDebugSnapshot,
  getDisplayConfig,
  saveDisplayConfig,
  setDisplayBrightness,
  setDisplayPower,
} from "../../shared/lib/tauri";
import { useDisplayState } from "../../shared/lib/useDisplayState";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { StatusBadge } from "../../shared/ui/StatusBadge";

const SNAPSHOT_DEFAULT: DeviceDebugSnapshot = {
  running: false,
  hostConnected: false,
  deviceHandleOpen: false,
  pollCount: 0,
  commandCount: 0,
  lastDeviceStatus: null,
  lastPollAtMs: null,
  lastReadSize: null,
  lastCommandAtMs: null,
  lastCommand: null,
  lastCommandValue: null,
  lastCommandStatus: null,
  lastCommandError: null,
  lastBrightness: null,
  lastDisplayOn: null,
  lastTouchPressed: null,
  lastTouchX: null,
  lastTouchY: null,
  lastTouchZ: null,
};

const FILL_PRESETS = [
  { label: "Black", rgb565: 0x0000, swatch: "#000000" },
  { label: "White", rgb565: 0xffff, swatch: "#ffffff" },
  { label: "Red", rgb565: 0xf800, swatch: "#ef4444" },
  { label: "Green", rgb565: 0x07e0, swatch: "#22c55e" },
  { label: "Blue", rgb565: 0x001f, swatch: "#3b82f6" },
];

type LogLevel = "info" | "success" | "error";

interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  at: number;
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleTimeString();
}

function levelClass(level: LogLevel) {
  if (level === "error") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  if (level === "success") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  return "border-border bg-muted/40 text-foreground";
}

function Indicator({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`}
        />
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

export function DeviceDebugView() {
  const { status, statusDetail, connect, disconnect } = useDevice();
  const displayState = useDisplayState();
  const [snapshot, setSnapshot] =
    useState<DeviceDebugSnapshot>(SNAPSHOT_DEFAULT);
  const [savedConfig, setSavedConfig] = useState<DisplayConfig>(
    DEFAULT_DISPLAY_CONFIG,
  );
  const [brightnessDraft, setBrightnessDraft] = useState(
    displayState.brightness,
  );
  const [brightnessDirty, setBrightnessDirty] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const lastStatusRef = useRef<string>("");

  const pushLog = useCallback((level: LogLevel, message: string) => {
    const entry = {
      id: Date.now() + Math.random(),
      level,
      message,
      at: Date.now(),
    };
    setLogs((current) => [entry, ...current].slice(0, 40));
    if (level === "error") {
      console.error("[glyf][debug]", message);
      return;
    }
    console.info("[glyf][debug]", message);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const next = await getDeviceDebugSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  const refreshSavedConfig = useCallback(async () => {
    const next = await getDisplayConfig();
    setSavedConfig(next);
    return next;
  }, []);

  async function runAction(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    pushLog("info", `${label}: start`);
    try {
      await action();
      await refreshSnapshot();
      pushLog("success", `${label}: ok`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushLog("error", `${label}: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    void refreshSnapshot().catch((error) => {
      console.error("Failed to load device debug snapshot", error);
    });
    void refreshSavedConfig().catch((error) => {
      console.error("Failed to load display config", error);
    });

    const timer = window.setInterval(() => {
      void refreshSnapshot().catch((error) => {
        console.error("Failed to refresh device debug snapshot", error);
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [refreshSnapshot, refreshSavedConfig]);

  useEffect(() => {
    if (!brightnessDirty) {
      setBrightnessDraft(displayState.brightness);
    }
  }, [brightnessDirty, displayState.brightness]);

  useEffect(() => {
    const nextStatus = `${status}:${statusDetail ?? ""}`;
    if (nextStatus === lastStatusRef.current) {
      return;
    }
    lastStatusRef.current = nextStatus;
    pushLog(
      status === "connected" ? "success" : "info",
      `device-status ${status}${statusDetail ? ` — ${statusDetail}` : ""}`,
    );
  }, [status, statusDetail, pushLog]);

  const liveBrightness = snapshot.lastBrightness ?? displayState.brightness;
  const livePower = snapshot.lastDisplayOn ?? displayState.on;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Debug View</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Manual device controls, last host command status, and saved
                brightness/config state.
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void runAction("connect_device", connect)}
              disabled={status === "connecting" || status === "connected"}
            >
              Connect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runAction("disconnect_device", disconnect)}
              disabled={status === "disconnected"}
            >
              Disconnect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void runAction("refresh_debug_snapshot", async () => {
                  await refreshSnapshot();
                  await refreshSavedConfig();
                })
              }
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Indicator
            label="Poll Loop"
            value={snapshot.running ? "Running" : "Stopped"}
            active={snapshot.running}
          />
          <Indicator
            label="Host Link"
            value={snapshot.hostConnected ? "Connected" : "Waiting"}
            active={snapshot.hostConnected}
          />
          <Indicator
            label="HID Handle"
            value={snapshot.deviceHandleOpen ? "Open" : "Closed"}
            active={snapshot.deviceHandleOpen}
          />
          <Indicator
            label="Last Poll"
            value={formatTimestamp(snapshot.lastPollAtMs)}
            active={Boolean(snapshot.lastPollAtMs)}
          />
          <Indicator
            label="Poll Count"
            value={String(snapshot.pollCount)}
            active={snapshot.pollCount > 0}
          />
          <Indicator
            label="Command Count"
            value={String(snapshot.commandCount)}
            active={snapshot.commandCount > 0}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Manual Display Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Brightness</div>
                  <div className="text-xs text-muted-foreground">
                    Live {liveBrightness} · Saved {savedConfig.brightness}
                  </div>
                </div>
                <span className="text-sm tabular-nums">{brightnessDraft}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={brightnessDraft}
                onChange={(event) => {
                  setBrightnessDraft(Number(event.target.value));
                  setBrightnessDirty(true);
                }}
                className="w-full accent-primary"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    void runAction(
                      `set_brightness(${brightnessDraft})`,
                      async () => {
                        await setDisplayBrightness(brightnessDraft);
                        setBrightnessDirty(false);
                      },
                    )
                  }
                  disabled={status !== "connected" || busyAction !== null}
                >
                  Apply Brightness
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void runAction("save_brightness", async () => {
                      const nextConfig = {
                        ...savedConfig,
                        brightness: brightnessDraft,
                      };
                      await saveDisplayConfig(nextConfig);
                      setSavedConfig(nextConfig);
                      setBrightnessDirty(false);
                    })
                  }
                  disabled={busyAction !== null}
                >
                  Save As Default
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void runAction("apply_saved_brightness", async () => {
                      setBrightnessDraft(savedConfig.brightness);
                      setBrightnessDirty(false);
                      if (status === "connected") {
                        await setDisplayBrightness(savedConfig.brightness);
                      }
                    })
                  }
                  disabled={busyAction !== null}
                >
                  Apply Saved Brightness
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Power</div>
                  <div className="text-xs text-muted-foreground">
                    Live state {livePower ? "On" : "Off"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    void runAction(`set_power(${!livePower})`, async () => {
                      await setDisplayPower(!livePower);
                    })
                  }
                  disabled={status !== "connected" || busyAction !== null}
                >
                  {livePower ? "Turn Off" : "Turn On"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="text-sm font-medium">Fill Display</div>
                <div className="text-xs text-muted-foreground">
                  Send a solid RGB565 fill to confirm command writes reach the
                  firmware.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILL_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void runAction(
                        `fill_display(${preset.label})`,
                        async () => {
                          await fillDisplay(preset.rgb565);
                        },
                      )
                    }
                    disabled={status !== "connected" || busyAction !== null}
                  >
                    <span
                      className="mr-2 inline-block size-3 rounded-full border border-border"
                      style={{ backgroundColor: preset.swatch }}
                    />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debug Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Last Device Status
              </div>
              <div className="mt-1 font-medium">
                {snapshot.lastDeviceStatus ?? statusDetail ?? "n/a"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Indicator
                label="Last Command"
                value={snapshot.lastCommand ?? "n/a"}
                active={Boolean(snapshot.lastCommand)}
              />
              <Indicator
                label="Command Result"
                value={snapshot.lastCommandStatus ?? "n/a"}
                active={snapshot.lastCommandError == null}
              />
              <Indicator
                label="Command Value"
                value={snapshot.lastCommandValue ?? "n/a"}
                active={Boolean(snapshot.lastCommandValue)}
              />
              <Indicator
                label="Last Read Size"
                value={
                  snapshot.lastReadSize == null
                    ? "n/a"
                    : `${snapshot.lastReadSize} bytes`
                }
                active={snapshot.lastReadSize != null}
              />
              <Indicator
                label="Live Brightness"
                value={String(liveBrightness)}
                active={liveBrightness > 0}
              />
              <Indicator
                label="Touch"
                value={
                  snapshot.lastTouchPressed
                    ? `${snapshot.lastTouchX}, ${snapshot.lastTouchY}`
                    : "Idle"
                }
                active={Boolean(snapshot.lastTouchPressed)}
              />
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Command Error
              </div>
              <div className="mt-1 font-mono text-xs break-all">
                {snapshot.lastCommandError ?? "none"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {logs.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No debug activity yet.
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-md border px-3 py-2 text-sm ${levelClass(entry.level)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{entry.message}</span>
                  <span className="shrink-0 text-[11px] opacity-70">
                    {formatTimestamp(entry.at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
