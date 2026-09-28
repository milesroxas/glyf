import { MAX_WAIT_MS } from "@glyf/keymap-schema";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { MacroStep } from "../../../entities/keymap";
import { MacroEditor } from "./MacroEditor";

let sequence: MacroStep[] = [];

function Harness({ initial = [] }: { initial?: MacroStep[] }) {
  const [steps, setSteps] = useState(initial);
  sequence = steps;
  return (
    <MacroEditor
      action={{ action: "macro", sequence: steps }}
      onChange={setSteps}
    />
  );
}

async function addStep(label: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Add step" }), {
    button: 0,
    ctrlKey: false,
  });
  fireEvent.click(await screen.findByRole("menuitem", { name: label }));
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
}

/** The new step's recorder, once it is recording. */
const recording = (label: string) =>
  screen.findByRole("button", { name: new RegExp(`^${label}`), pressed: true });

describe("MacroEditor", () => {
  it("adds a key down step once its key is recorded", async () => {
    render(<Harness />);
    await addStep("Key down");
    expect(sequence).toEqual([]);
    const recorder = await recording("Key down");
    expect(recorder).toHaveFocus();
    fireEvent.keyDown(recorder, { code: "ShiftLeft", shiftKey: true });
    fireEvent.keyUp(recorder, { code: "ShiftLeft" });
    expect(sequence).toEqual([{ type: "keydown", key: "shift" }]);
  });

  it("drops the new step when recording is cancelled", async () => {
    render(<Harness />);
    await addStep("Key up");
    fireEvent.keyDown(await recording("Key up"), { code: "Escape" });
    expect(screen.queryByRole("button", { name: /^Key up/ })).toBeNull();
    expect(sequence).toEqual([]);
  });

  it("keeps a text step's field while typing in it", async () => {
    render(<Harness />);
    await addStep("Type text");
    const field = screen.getByRole("textbox", { name: /Step 1/ });
    field.focus();
    fireEvent.change(field, { target: { value: "hi" } });
    expect(screen.getByRole("textbox", { name: /Step 1/ })).toBe(field);
    expect(field).toHaveFocus();
    expect(sequence).toEqual([{ type: "text", text: "hi" }]);
  });

  it("moves a step with the arrow keys on its handle", () => {
    render(
      <Harness
        initial={[
          { type: "text", text: "first" },
          { type: "keypress", key: "a" },
        ]}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: /^Reorder step 1/ }), {
      key: "ArrowDown",
    });
    expect(sequence).toEqual([
      { type: "keypress", key: "a" },
      { type: "text", text: "first" },
    ]);
  });

  it("holds a wait to the schema's limit", () => {
    render(<Harness initial={[{ type: "wait", ms: 100 }]} />);
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: String(MAX_WAIT_MS * 2) },
    });
    expect(sequence).toEqual([{ type: "wait", ms: MAX_WAIT_MS }]);
  });
});
