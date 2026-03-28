import type { TouchEvent } from "../../entities/touch";

interface TouchPointProps {
  event: TouchEvent;
  /** Scale from display pixels → canvas pixels */
  scale: number;
}

export function TouchPointDot({ event, scale }: TouchPointProps) {
  const size = Math.max(4, event.pressure * 12);
  return (
    <circle
      cx={event.x * scale}
      cy={event.y * scale}
      r={size / 2}
      fill="hsl(var(--primary))"
      fillOpacity={0.6 + event.pressure * 0.4}
    />
  );
}
