import { useId } from "react";
import { useLoginItem } from "../../shared/lib/useLoginItem";
import { Button } from "../../shared/ui/button";
import { Checkbox } from "../../shared/ui/checkbox";

/** The menu bar icon, drawn as the pad from above (the tray icon's shape). */
function PadGlyph({ className }: { className?: string }) {
  const keys: [number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (row !== 0 || col !== 3) keys.push([col * 4.5, row * 4.5]);
    }
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 17 13"
      className={className}
      fill="currentColor"
    >
      {keys.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x} y={y} width="3.5" height="3.5" rx="0.8" />
      ))}
      <circle
        cx="15.25"
        cy="1.75"
        r="1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

/**
 * Shown once, the first time the designer closes: the app did not quit, it
 * lives up here, and the keys still work. Offers Open at Login at the one
 * moment it makes sense.
 */
export function CloseTip({ onDone }: { onDone: () => void }) {
  const login = useLoginItem();
  const checkboxId = useId();
  return (
    <aside
      aria-labelledby={`${checkboxId}-title`}
      className="mb-2 rounded-[12px] bg-[var(--glass-well)] p-3 shadow-[inset_0_0_0_1px_var(--glass-edge)]"
    >
      <div className="flex gap-2.5">
        <PadGlyph className="mt-0.5 h-3.25 w-4.25 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2
            id={`${checkboxId}-title`}
            className="text-[13px] leading-[18px] font-semibold text-foreground"
          >
            Macro Eleven is still running
          </h2>
          <p className="mt-0.5 text-[12px] leading-4 text-foreground/75">
            Your keys work with the window closed. Click the pad icon up here to
            come back.
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2 pl-6.75">
        {login.status !== "unavailable" && (
          <>
            <Checkbox
              id={checkboxId}
              data-panel-item
              checked={
                login.status === "enabled" ||
                login.status === "requiresApproval"
              }
              disabled={login.status === null}
              onCheckedChange={(checked) => login.set(checked === true)}
            />
            <label htmlFor={checkboxId} className="text-[12px] text-foreground">
              Open at login
            </label>
          </>
        )}
        <Button
          size="xs"
          variant="secondary"
          data-panel-item
          className="ml-auto px-2.5"
          onClick={onDone}
        >
          Got it
        </Button>
      </div>
    </aside>
  );
}
