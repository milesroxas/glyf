import { Layers, ListOrdered, Puzzle } from "lucide-react";
import type { CSSProperties } from "react";
import type { KeyFace } from "../../entities/action";
import { cn } from "../lib/utils";
import { AppIcon } from "./AppIcon";
import "./pad.css";

const KIND_GLYPHS = { layer: Layers, macro: ListOrdered, plugin: Puzzle };

/** Letters in the label's longest word; pad.css fits the label to it. */
function longestWord(label: string): number {
  return Math.max(1, ...label.split(/\s+/).map((word) => word.length));
}

/**
 * What a key does, printed on its cap: the app or shortcut, the label, and a
 * glyph for layer, macro, and plugin keys. Scales with the key (--key).
 */
export function KeyLegend({
  face,
  className,
}: {
  face: KeyFace;
  className?: string;
}) {
  const Glyph =
    face.kind in KIND_GLYPHS
      ? KIND_GLYPHS[face.kind as keyof typeof KIND_GLYPHS]
      : null;
  return (
    <span
      data-glyph={Glyph ? "" : undefined}
      className={cn("key-legend", className)}
    >
      <span className="key-legend__mark">
        {face.kind === "app" ? (
          <AppIcon app={face.app} className="key-legend__icon" />
        ) : (
          face.shortcut && <span className="truncate">{face.shortcut}</span>
        )}
      </span>
      <span
        className={cn(
          "key-legend__label",
          face.kind === "plugin" && "text-muted-foreground",
        )}
        style={{ "--_word": longestWord(face.label) } as CSSProperties}
      >
        {face.label}
      </span>
      {Glyph && <Glyph aria-hidden className="key-legend__glyph" />}
    </span>
  );
}
