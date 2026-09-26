import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useElementWidth } from "../../shared/lib/useElementWidth";
import { cn } from "../../shared/lib/utils";
import { Button } from "../../shared/ui/button";
import { Keycap } from "../../shared/ui/Keycap";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { Switch } from "../../shared/ui/switch";
import { DragToKeyProvider } from "./apps/DragToKey";
import { KeyCanvas } from "./canvas/KeyCanvas";
import { DesignerToolbar } from "./DesignerToolbar";
import { Inspector } from "./inspector/Inspector";
import { InspectorSheet } from "./inspector/InspectorSheet";
import { KeymapProvider, useDesigner } from "./model/KeymapProvider";
import { DuplicateDefaultDialog } from "./profiles/ProfileMenu";

/** Canvas (the pad plus margins) and the 320 px inspector side by side. */
const TWO_COLUMN_MIN_WIDTH = 760;

function CanvasFooter() {
  const { device, selectByPressing, setSelectByPressing } = useDesigner();
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>
        {device.connected
          ? selectByPressing
            ? "Press a key on Macro Eleven to select it."
            : "Macro Eleven is connected."
          : "Plug in Macro Eleven to select keys by pressing them."}
      </span>
      {device.connected && (
        // biome-ignore lint/a11y/noLabelWithoutControl: the switch is the control
        <label className="flex items-center gap-2">
          Select by pressing
          <Switch
            checked={selectByPressing}
            onCheckedChange={setSelectByPressing}
          />
        </label>
      )}
    </div>
  );
}

/** Empty keys in the pad's shape while the profile loads. */
function CanvasSkeleton() {
  return (
    <div className="pad-plate opacity-60">
      <MacropadGrid renderKey={() => <Keycap empty className="h-full" />} />
    </div>
  );
}

/**
 * Key size for the room the canvas has (cqw/cqh of the canvas column): the
 * pad takes most of the width and leaves room below for the footer, or for
 * the inspector sheet when it slides up. Never smaller than a legible key;
 * never larger than a key on the pad itself.
 */
const KEY_SIZE = {
  beside: "[--key:clamp(64px,min(18cqw,18.5cqh),104px)]",
  sheet: "[--key:clamp(64px,min(18cqw,11.5cqh),104px)]",
};

function DesignerBody() {
  const { keymap, loadError, retryLoad } = useDesigner();
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(body);
  const twoColumns = width === null || width >= TWO_COLUMN_MIN_WIDTH;

  if (!keymap && loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <TriangleAlert className="size-6 text-destructive" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">Your keymap could not be loaded</p>
          <p className="max-w-md text-xs text-muted-foreground">{loadError}</p>
        </div>
        <Button size="sm" variant="outline" onClick={retryLoad}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {keymap && <DesignerToolbar />}
      <div ref={setBody} className="relative flex min-h-0 flex-1">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-6 overflow-auto p-6 @container-[size]",
            // With the sheet up, keep the pad at the top, above the sheet
            twoColumns ? "justify-center" : "justify-start pb-[60vh]",
          )}
        >
          <div className={twoColumns ? KEY_SIZE.beside : KEY_SIZE.sheet}>
            {keymap ? <KeyCanvas /> : <CanvasSkeleton />}
          </div>
          <CanvasFooter />
        </div>
        {keymap &&
          (twoColumns ? (
            <aside className="w-80 shrink-0 border-l bg-card/40">
              <Inspector />
            </aside>
          ) : (
            <InspectorSheet />
          ))}
      </div>
      <DuplicateDefaultDialog />
    </div>
  );
}

/**
 * The Keymap Designer: every key on every layer, edited in place. Changes
 * save as you go and reach the pad at once; ⌘Z undoes them.
 */
export function KeymapDesigner() {
  return (
    <KeymapProvider>
      <DragToKeyProvider>
        <DesignerBody />
      </DragToKeyProvider>
    </KeymapProvider>
  );
}
