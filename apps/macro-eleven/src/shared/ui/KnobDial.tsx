import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import "./KnobDial.css";

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const ANGLE_SPAN = MAX_ANGLE - MIN_ANGLE;

export interface KnobDialProps {
  /** Normalized value 0–1 */
  value?: number;
  /** Number of tick dots around the ring */
  ticks?: number;
  /** Accessible label */
  label?: string;
  /** Outer container class — use to control size (font-size scales the em-based layout) */
  className?: string;
  /** Fills a container-type:size parent using cqw/cqh units, staying square */
  fluid?: boolean;
  /** When provided the knob is interactive; omit for read-only display */
  onChange?: (value: number) => void;
}

interface KnobDotProps {
  angle: number;
  filled: boolean;
}

function KnobDot({ angle, filled }: KnobDotProps) {
  return (
    <div
      className={cn("knob__dot", filled && "knob__dot--filled")}
      style={{ transform: `rotate(${angle}deg)` }}
    />
  );
}

export function KnobDial({
  value = 0,
  ticks = 31,
  label = "Knob",
  className,
  fluid = false,
  onChange,
}: KnobDialProps) {
  const maxTick = Math.max(1, ticks);
  const clamped = Math.max(0, Math.min(1, value));
  const interactive = Boolean(onChange);

  const [angle, setAngle] = useState(MIN_ANGLE + clamped * ANGLE_SPAN);

  // Sync controlled value → internal angle (read-only / hardware-driven mode)
  useEffect(() => {
    if (!interactive) {
      setAngle(MIN_ANGLE + clamped * ANGLE_SPAN);
    }
  }, [clamped, interactive]);

  const vol = (angle - MIN_ANGLE) / ANGLE_SPAN;
  const tick = vol * maxTick;

  const dotSectorAngle = ANGLE_SPAN / maxTick;
  const dotSectorAngleOffset = -ANGLE_SPAN / 2 + dotSectorAngle / 2;
  const dotTickOffset = 0.5;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startPtrAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startDialAngle = angle;

    const onMove = (me: PointerEvent) => {
      const ptrAngle =
        Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI);
      let delta = ptrAngle - startPtrAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const next = Math.max(
        MIN_ANGLE,
        Math.min(MAX_ANGLE, startDialAngle + delta),
      );
      setAngle(next);
      onChange?.((next - MIN_ANGLE) / ANGLE_SPAN);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const up = e.code === "ArrowUp" || e.code === "ArrowRight";
    const down = e.code === "ArrowDown" || e.code === "ArrowLeft";
    if (!up && !down) return;
    e.preventDefault();
    const currentTick = Math.round(tick);
    const nextTick = up
      ? Math.min(currentTick + 1, maxTick)
      : Math.max(0, currentTick - 1);
    const next = MIN_ANGLE + (nextTick / maxTick) * ANGLE_SPAN;
    setAngle(next);
    onChange?.((next - MIN_ANGLE) / ANGLE_SPAN);
  };

  return (
    <div
      className={cn(
        "knob__control",
        fluid && "knob__control--fluid",
        className,
      )}
    >
      {Array.from({ length: ticks }, (_, t) => {
        const angle = dotSectorAngle * t + dotSectorAngleOffset;
        return (
          <KnobDot
            key={`dot-${angle}`}
            angle={angle}
            filled={t < tick - dotTickOffset}
          />
        );
      })}
      <div className="knob__dial-wrap">
        <button
          className="knob__dial"
          type="button"
          style={{ transform: `rotate(${angle}deg)` }}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-valuenow={Math.round(vol * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="slider"
          tabIndex={interactive ? 0 : -1}
          data-interactive={interactive || undefined}
        >
          <span className="knob__dial-label">{label}</span>
        </button>
      </div>
    </div>
  );
}
