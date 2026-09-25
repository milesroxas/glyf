export const INSPECTOR_ID = "key-inspector";

/** Move keyboard focus to the inspector's first control. */
export function focusInspector(): void {
  document
    .getElementById(INSPECTOR_ID)
    ?.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), [tabindex='0']",
    )
    ?.focus();
}
