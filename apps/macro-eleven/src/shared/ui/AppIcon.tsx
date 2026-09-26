import { AppWindow } from "lucide-react";
import type { InstalledApp } from "../../entities/app";
import { assetUrl } from "../lib/tauri";
import { cn } from "../lib/utils";

/** An app's Finder icon, or a generic app glyph when it has none. */
export function AppIcon({
  app,
  className,
}: {
  app: InstalledApp | undefined;
  className?: string;
}) {
  if (!app?.iconPath) {
    return (
      <AppWindow
        aria-hidden
        className={cn("shrink-0 text-muted-foreground", className)}
      />
    );
  }
  return (
    <img
      src={assetUrl(app.iconPath)}
      alt=""
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
