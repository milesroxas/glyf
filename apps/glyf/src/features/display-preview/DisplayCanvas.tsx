import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from "../../entities/display";

interface DisplayCanvasProps {
  /** Scale factor (1 = actual 480×320, 0.5 = 240×160, etc.) */
  scale?: number;
  /** Optional class for the wrapper */
  className?: string;
}

/**
 * Scaled canvas representation of the glyf display surface.
 * Currently renders a placeholder; future versions will stream pixel data.
 */
export function DisplayCanvas({ scale = 0.5, className }: DisplayCanvasProps) {
  const w = Math.round(DISPLAY_WIDTH * scale);
  const h = Math.round(DISPLAY_HEIGHT * scale);

  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        background: "#000",
        border: "1px solid hsl(var(--border))",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#555",
        fontSize: "12px",
        fontFamily: "monospace",
        flexShrink: 0,
      }}
    >
      {DISPLAY_WIDTH}×{DISPLAY_HEIGHT}
    </div>
  );
}
