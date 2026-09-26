import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShortcutRecorder } from "./ShortcutRecorder";

function setup(value: string[] = ["cmd", "t"]) {
  const handlers = { onCommit: vi.fn(), onCancel: vi.fn(), onClear: vi.fn() };
  render(
    <ShortcutRecorder aria-label="Shortcut" value={value} {...handlers} />,
  );
  const field = screen.getByRole("button", { name: /^Shortcut/ });
  fireEvent.click(field);
  return { field, ...handlers };
}

describe("ShortcutRecorder", () => {
  it("shows the value as macOS glyphs", () => {
    render(
      <ShortcutRecorder
        aria-label="Shortcut"
        value={["cmd", "shift", "t"]}
        onCommit={() => {}}
      />,
    );
    expect(screen.getByText("⇧⌘T")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Shortcut: Shift Command T" }),
    ).toBeInTheDocument();
  });

  it("records a chord live and keeps it when the key comes up", () => {
    const { field, onCommit } = setup();
    fireEvent.keyDown(field, { code: "MetaLeft", metaKey: true });
    fireEvent.keyDown(field, {
      code: "ShiftLeft",
      metaKey: true,
      shiftKey: true,
    });
    fireEvent.keyDown(field, { code: "KeyP", metaKey: true, shiftKey: true });
    expect(screen.getByText("⇧⌘P")).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(field, { code: "KeyP", metaKey: true, shiftKey: true });
    expect(onCommit).toHaveBeenCalledWith(["shift", "cmd", "p"]);
  });

  it("keeps a ⌘ chord when only ⌘ comes up", () => {
    // macOS sends no key-up for a key pressed with ⌘ held
    const { field, onCommit } = setup([]);
    fireEvent.keyDown(field, { code: "MetaLeft", metaKey: true });
    fireEvent.keyDown(field, { code: "Digit1", metaKey: true });
    fireEvent.keyUp(field, { code: "MetaLeft" });
    expect(onCommit).toHaveBeenCalledWith(["cmd", "1"]);
  });

  it("keeps recording while another app has focus", () => {
    const { field, onCommit, onCancel } = setup([]);
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    fireEvent.blur(field);
    hasFocus.mockRestore();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Recording…")).toBeInTheDocument();
    fireEvent.keyDown(field, { code: "KeyK", ctrlKey: true });
    fireEvent.keyUp(field, { code: "KeyK", ctrlKey: true });
    expect(onCommit).toHaveBeenCalledWith(["ctrl", "k"]);
  });

  it("cancels when focus moves elsewhere in the window", () => {
    const { field, onCancel } = setup([]);
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true);
    fireEvent.blur(field);
    hasFocus.mockRestore();
    expect(onCancel).toHaveBeenCalled();
  });

  it("cancels with Esc and keeps the old value", () => {
    const { field, onCommit, onCancel } = setup();
    fireEvent.keyDown(field, { code: "KeyK", metaKey: true });
    fireEvent.keyDown(field, { code: "Escape" });
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("⌘T")).toBeInTheDocument();
  });

  it("clears with Backspace alone but records it with a modifier", () => {
    const { field, onClear, onCommit } = setup();
    fireEvent.keyDown(field, { code: "Backspace", metaKey: true });
    fireEvent.keyUp(field, { code: "Backspace", metaKey: true });
    expect(onCommit).toHaveBeenCalledWith(["cmd", "backspace"]);
    fireEvent.click(field);
    fireEvent.keyDown(field, { code: "Backspace" });
    expect(onClear).toHaveBeenCalled();
  });

  it("refuses keys the pad cannot send", () => {
    const { field, onCommit } = setup();
    fireEvent.keyDown(field, { code: "F13" });
    expect(screen.getByText(/can’t send that key/)).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("records a lone modifier in key mode", () => {
    const onCommit = vi.fn();
    render(
      <ShortcutRecorder
        mode="key"
        aria-label="Key"
        value={[]}
        onCommit={onCommit}
      />,
    );
    const field = screen.getByRole("button", { name: /^Key/ });
    fireEvent.click(field);
    fireEvent.keyDown(field, { code: "AltLeft", altKey: true });
    fireEvent.keyUp(field, { code: "AltLeft" });
    expect(onCommit).toHaveBeenCalledWith(["option"]);
  });
});
