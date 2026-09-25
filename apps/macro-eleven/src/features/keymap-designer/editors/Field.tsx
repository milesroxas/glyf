import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../shared/lib/utils";

/** A labeled row in the inspector. */
export function Field({
  label,
  htmlFor,
  aside,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  /** Right-aligned next to the label (a character count). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** An inline warning under a field. Warnings never block saving. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-warning">
      <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
