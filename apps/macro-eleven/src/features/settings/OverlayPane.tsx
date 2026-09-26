import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  Backdrop,
  OverlayMaterial,
  Settings,
} from "../../entities/settings";
import {
  getBackdrop,
  pauseOverlayShortcut,
  previewOverlayTransparency,
  resetOverlayFrame,
} from "../../shared/lib/tauri";
import { usePageVisible } from "../../shared/lib/usePageVisible";
import { Button } from "../../shared/ui/button";
import { ShortcutRecorder } from "../../shared/ui/ShortcutRecorder";
import { SegmentedChoice } from "../../shared/ui/segmented-choice";
import { Slider } from "../../shared/ui/slider";
import { Switch } from "../../shared/ui/switch";
import { Row, Section } from "./Form";
import { shortcutProblem } from "./shortcut";

interface PaneProps {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}

const MATERIALS: readonly { value: OverlayMaterial; label: string }[] = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];

/** A slider move reaches the overlay at most this often while dragging. */
const PREVIEW_MS = 32;

/**
 * Transparency previews on the overlay while it moves and saves on release,
 * so dragging writes nothing to disk.
 */
function TransparencySlider({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const lastSent = useRef(0);
  const shown = Math.round((draft ?? value) * 100);

  return (
    <div className="flex w-52 items-center gap-2.5 text-[11px] text-muted-foreground">
      <span aria-hidden>Less</span>
      <Slider
        aria-label="Transparency"
        min={0}
        max={100}
        step={1}
        value={[shown]}
        disabled={disabled}
        onValueChange={([next]) => {
          setDraft(next / 100);
          const now = performance.now();
          if (now - lastSent.current >= PREVIEW_MS) {
            lastSent.current = now;
            previewOverlayTransparency(next / 100).catch(() => {});
          }
        }}
        onValueCommit={([next]) => {
          setDraft(null);
          onCommit(next / 100);
        }}
      />
      <span aria-hidden>More</span>
    </div>
  );
}

export function OverlayPane({ settings, update }: PaneProps) {
  const [backdrop, setBackdrop] = useState<Backdrop | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const visible = usePageVisible();
  const save = (patch: Partial<Settings>) => {
    update(patch).catch((error) => console.error(error));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the host's answer follows the material
  useEffect(() => {
    if (!visible) return;
    getBackdrop("overlay").then(setBackdrop, () => {});
  }, [settings.overlayMaterial, visible]);

  // A hidden window can't be recording: never leave the shortcut paused
  useEffect(() => {
    if (!visible) pauseOverlayShortcut(false).catch(() => {});
  }, [visible]);

  const saveShortcut = async (overlayShortcut: string[]) => {
    setShortcutError(null);
    try {
      await update({ overlayShortcut });
    } catch (error) {
      setShortcutError(String(error));
    }
  };

  const glass = settings.overlayMaterial === "glass";
  // Glass is on, but System Settings asks for less transparency
  const reduced = glass && backdrop === "solid";

  return (
    <div className="grid gap-6">
      <Section>
        <Row
          label="Show overlay"
          description="A small window drawn as your pad. It shows what each key does and lights keys as you press them."
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.overlayVisible}
              onCheckedChange={(overlayVisible) => save({ overlayVisible })}
            />
          )}
        />
        <Row
          label="Keyboard shortcut"
          description="Shows or hides the overlay from any app."
          control={() => (
            <div className="flex items-center gap-1">
              <ShortcutRecorder
                aria-label="Overlay shortcut"
                className="w-36"
                value={settings.overlayShortcut}
                validate={shortcutProblem}
                onCommit={saveShortcut}
                onClear={() => saveShortcut([])}
                onRecordingChange={(recording) => {
                  pauseOverlayShortcut(recording).catch(() => {});
                }}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove the shortcut"
                className="text-muted-foreground data-[hidden]:invisible"
                data-hidden={settings.overlayShortcut.length ? undefined : ""}
                onClick={() => saveShortcut([])}
              >
                <X />
              </Button>
            </div>
          )}
        >
          {shortcutError && (
            <p role="alert" className="mt-1.5 text-[11px] text-destructive">
              {shortcutError}
            </p>
          )}
        </Row>
      </Section>

      <Section
        title="Appearance"
        footer={
          reduced
            ? "Reduce transparency is on in System Settings, so the overlay is solid."
            : undefined
        }
      >
        <Row
          label="Background"
          control={() => (
            <SegmentedChoice
              label="Background"
              className="w-40"
              value={settings.overlayMaterial}
              options={MATERIALS}
              onValueChange={(overlayMaterial) => save({ overlayMaterial })}
            />
          )}
        />
        <Row
          label="Transparency"
          description="How much shows through the glass."
          disabled={!glass || reduced}
          control={() => (
            <TransparencySlider
              value={settings.overlayTransparency}
              disabled={!glass || reduced}
              onCommit={(overlayTransparency) => save({ overlayTransparency })}
            />
          )}
        />
      </Section>

      <Section title="Behavior">
        <Row
          label="Keep on top of other windows"
          control={({ labelId }) => (
            <Switch
              aria-labelledby={labelId}
              checked={settings.overlayOnTop}
              onCheckedChange={(overlayOnTop) => save({ overlayOnTop })}
            />
          )}
        />
        <Row
          label="Show on all Spaces"
          description="The overlay stays with you when you switch desktops."
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.overlayAllSpaces}
              onCheckedChange={(overlayAllSpaces) => save({ overlayAllSpaces })}
            />
          )}
        />
        <Row
          label="Fade when idle"
          description="Fades after a few quiet seconds. Press a key or point at it to bring it back."
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.overlayFadeWhenIdle}
              onCheckedChange={(overlayFadeWhenIdle) =>
                save({ overlayFadeWhenIdle })
              }
            />
          )}
        />
        <Row
          label="Position and size"
          description="Moves the overlay back to the bottom right of your main screen, at its first size."
          control={({ labelId, descriptionId }) => (
            <Button
              variant="outline"
              size="xs"
              aria-describedby={`${labelId} ${descriptionId}`}
              className="px-2.5 text-[12px]"
              onClick={() => {
                resetOverlayFrame().catch((error) => console.error(error));
              }}
            >
              Reset
            </Button>
          )}
        />
      </Section>
    </div>
  );
}
