/**
 * App settings: what the Settings window shows. Mirrors `Settings` in
 * `src-tauri/src/config/settings.rs`.
 */

export type OverlayMaterial = "glass" | "solid";

export interface Settings {
  /** The menu bar icon. */
  menuBarIcon: boolean;
  /** The live layer's name beside the menu bar icon. */
  menuBarLayer: boolean;
  /** A Dock icon while the designer or Settings is open. */
  dockIcon: boolean;
  overlayVisible: boolean;
  overlayOnTop: boolean;
  overlayAllSpaces: boolean;
  overlayMaterial: OverlayMaterial;
  /** How much of the desktop shows through the glass: 0 to 1. */
  overlayTransparency: number;
  /** Fade after a few seconds without input. */
  overlayFadeWhenIdle: boolean;
  /** Shows or hides the overlay from any app. Shortcut tokens; empty for none. */
  overlayShortcut: string[];
}

/** Whether macOS opens the app at login, as System Settings shows it. */
export type LoginItemStatus =
  | "enabled"
  | "disabled"
  /** Turned on, but the user must allow it in System Settings. */
  | "requiresApproval"
  /** macOS cannot find the app, as in a development build. */
  | "unavailable";

/**
 * What a see-through window (the overlay, the menu bar panel) draws behind
 * its content: glass, or solid when Reduce Transparency is on or the
 * overlay is set to Solid.
 */
export type Backdrop = "glass" | "solid";

/**
 * How strongly the overlay's glass is tinted toward the chassis color, from
 * the Transparency setting: some tint always stays, so the title reads.
 */
export function glassTint(transparency: number): number {
  const clamped = Math.min(1, Math.max(0, transparency));
  return 0.12 + (1 - clamped) * 0.76;
}
