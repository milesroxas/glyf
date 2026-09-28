import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import type { MacroStep } from "../../../entities/keymap";
import { MacroEditor } from "./MacroEditor";

let sequence: MacroStep[] = [];

function Harness() {
  const [steps, setSteps] = useState<MacroStep[]>([]);
  sequence = steps;
  return (
    <MacroEditor
      action={{ action: "macro", sequence: steps }}
      onChange={setSteps}
    />
  );
}

describe("MacroEditor (browser)", () => {
  it.each([
    ["Shortcut", { type: "shortcut", keys: ["a"] }],
    ["Key down", { type: "keydown", key: "a" }],
    ["Key up", { type: "keyup", key: "a" }],
  ] as const)(
    "records a new %s step as the menu closes",
    async (label, step) => {
      render(<Harness />);
      await page.getByRole("button", { name: "Add step" }).click();
      await page.getByRole("menuitem", { name: label }).click();
      await expect
        .element(page.getByRole("button", { name: new RegExp(`^${label}:`) }))
        .toHaveFocus();
      await userEvent.keyboard("a");
      await expect.poll(() => sequence).toEqual([step]);
    },
  );
});
