import {
  CircleArrowUp,
  CircleCheck,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  FIRMWARE_STAGE_LABELS,
  type FirmwareStatus,
  overallProgress,
} from "../../entities/firmware";
import { Button } from "../../shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";
import { Progress } from "../../shared/ui/progress";
import { useFirmwareUpdate } from "./FirmwareUpdateProvider";

function VersionRow({ status }: { status: FirmwareStatus | null }) {
  const installed =
    status?.mode === "ready" ? (status.version ?? "Before 1.1.0") : "—";
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4">
      <div className="space-y-1">
        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Installed
        </dt>
        <dd className="font-mono text-lg tabular-nums">{installed}</dd>
      </div>
      <div className="space-y-1">
        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Latest
        </dt>
        <dd className="font-mono text-lg tabular-nums">
          {status?.bundledVersion ?? "—"}
        </dd>
      </div>
    </dl>
  );
}

function Notice({
  icon,
  tone = "default",
  children,
}: {
  icon: ReactNode;
  tone?: "default" | "success" | "error";
  children: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-primary",
    error: "text-destructive",
  }[tone];
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className={`mt-0.5 shrink-0 ${toneClass}`}>{icon}</span>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function FirmwareUpdatePanel() {
  const { status, statusError, update, startUpdate, dismissResult } =
    useFirmwareUpdate();
  const bundled = status?.bundledVersion;

  let body: ReactNode = null;
  let footer: ReactNode = null;

  if (update.kind === "running") {
    const progress = update.progress;
    const percent = progress ? Math.round(overallProgress(progress) * 100) : 0;
    const waitingForKey = progress?.stage === "waiting-for-bootloader";
    body = (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {progress ? FIRMWARE_STAGE_LABELS[progress.stage] : "Preparing"}
          </span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} aria-label="Firmware update progress" />
        {waitingForKey ? (
          <p className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            Your current firmware can't restart itself for updates. Hold the
            top-left key for 2 seconds. After this update, you won't need to.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keep Macro Eleven plugged in until the update finishes.
          </p>
        )}
      </div>
    );
  } else if (update.kind === "succeeded") {
    body = (
      <Notice icon={<CircleCheck className="size-4" />} tone="success">
        <p className="font-medium">Firmware {update.version} installed</p>
        <p className="text-muted-foreground">Macro Eleven is ready to use.</p>
      </Notice>
    );
    footer = (
      <Button variant="outline" onClick={dismissResult}>
        Done
      </Button>
    );
  } else if (update.kind === "failed") {
    body = (
      <Notice icon={<TriangleAlert className="size-4" />} tone="error">
        <p className="font-medium">The update didn't finish</p>
        <p className="text-muted-foreground">{update.error}</p>
        <p className="text-muted-foreground">
          You can try again. If Macro Eleven stops responding, unplug it and
          plug it back in first.
        </p>
      </Notice>
    );
    footer = (
      <>
        <Button onClick={startUpdate}>Try again</Button>
        <Button variant="ghost" onClick={dismissResult}>
          Dismiss
        </Button>
      </>
    );
  } else if (statusError) {
    body = (
      <Notice icon={<TriangleAlert className="size-4" />} tone="error">
        <p className="font-medium">Firmware updates are unavailable</p>
        <p className="text-muted-foreground">{statusError}</p>
      </Notice>
    );
  } else if (!status) {
    body = (
      <Notice icon={<LoaderCircle className="size-4 animate-spin" />}>
        <p className="text-muted-foreground">Checking for updates</p>
      </Notice>
    );
  } else if (status.mode === "disconnected") {
    body = (
      <p className="text-sm text-muted-foreground">
        Connect Macro Eleven over USB to check for updates.
      </p>
    );
  } else if (status.mode === "updating") {
    body = (
      <Notice icon={<LoaderCircle className="size-4 animate-spin" />}>
        <p className="text-muted-foreground">An update is in progress.</p>
      </Notice>
    );
  } else if (status.mode === "bootloader") {
    body = (
      <Notice icon={<CircleArrowUp className="size-4" />}>
        <p className="font-medium">A board is waiting in update mode</p>
        <p className="text-muted-foreground">
          This happens after an interrupted update. Install the firmware to
          finish. If another Raspberry Pi board is plugged in, unplug it first.
        </p>
      </Notice>
    );
    footer = <Button onClick={startUpdate}>Install firmware {bundled}</Button>;
  } else if (status.updateAvailable) {
    body = (
      <Notice icon={<CircleArrowUp className="size-4" />}>
        <p className="font-medium">Version {bundled} is available</p>
        <p className="text-muted-foreground">
          {status.version
            ? "Installs over USB in about 10 seconds."
            : "Your firmware is older than in-app updates. For this one update, you'll hold the top-left key for 2 seconds when asked."}
        </p>
      </Notice>
    );
    footer = <Button onClick={startUpdate}>Update to {bundled}</Button>;
  } else {
    body = (
      <Notice icon={<CircleCheck className="size-4" />} tone="success">
        <p className="font-medium">Up to date</p>
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Firmware</h2>
        <p className="text-sm text-muted-foreground">
          Install firmware updates for Macro Eleven.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Macro Eleven</CardTitle>
          <CardDescription>RP2040 · Raw HID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <VersionRow status={status} />
          <div aria-live="polite">{body}</div>
        </CardContent>
        {footer && <CardFooter className="gap-2">{footer}</CardFooter>}
      </Card>
    </div>
  );
}
