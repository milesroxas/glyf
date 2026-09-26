import { type ReactNode, useId } from "react";
import { cn } from "../../shared/lib/utils";

/**
 * A group of rows in a rounded box, as in System Settings: an optional
 * heading above, hairlines between rows, and an optional note below.
 */
export function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const heading = useId();
  return (
    <section
      aria-labelledby={title ? heading : undefined}
      className="grid gap-1.5"
    >
      {title && (
        <h2
          id={heading}
          className="px-3 text-[11px] font-semibold tracking-[0.01em] text-muted-foreground"
        >
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-[10px] border border-border bg-card/70 [&>[data-row]+[data-row]>[data-row-body]]:border-t [&>[data-row]+[data-row]>[data-row-body]]:border-border">
        {children}
      </div>
      {footer && (
        <p className="px-3 text-[11px] leading-[15px] text-muted-foreground">
          {footer}
        </p>
      )}
    </section>
  );
}

/**
 * One setting: the label and its help on the left, the control on the
 * right. Hairlines between rows start at the text, as on macOS.
 */
export function Row({
  label,
  description,
  control,
  htmlFor,
  disabled,
  children,
}: {
  label: string;
  /** One line or two of help under the label. */
  description?: ReactNode;
  control: (ids: { labelId: string; descriptionId?: string }) => ReactNode;
  /** The control's id, when it is a form element the label can point at. */
  htmlFor?: string;
  disabled?: boolean;
  /** Below the row's text and control: a warning or an action. */
  children?: ReactNode;
}) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div data-row className="px-3">
      <div data-row-body className="py-2.5">
        <div className="flex min-h-6 items-center gap-6">
          <div
            className={cn(
              "min-w-0 flex-1 transition-opacity duration-150",
              disabled && "opacity-45",
            )}
          >
            <label
              id={labelId}
              htmlFor={htmlFor}
              className="block text-[13px] leading-[18px] text-foreground"
            >
              {label}
            </label>
            {description && (
              <p
                id={descriptionId}
                className="mt-0.5 text-[11px] leading-[15px] text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            {control({
              labelId,
              descriptionId: description ? descriptionId : undefined,
            })}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
