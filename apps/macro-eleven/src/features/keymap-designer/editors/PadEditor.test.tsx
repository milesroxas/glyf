import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PadEditor } from "./PadEditor";

const keymap = MACRO_ELEVEN_DEFAULT_KEYMAP;

function choose(name: string) {
  fireEvent.pointerDown(screen.getByRole("combobox", { name: "Pad action" }), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  });
  fireEvent.click(screen.getByRole("option", { name }));
}

describe("PadEditor", () => {
  it("turns a layer key into an overlay key and back", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PadEditor
        action={{ action: "switch_layer", layer: 1 }}
        keymap={keymap}
        onChange={onChange}
      />,
    );
    choose("Show or hide overlay");
    expect(onChange).toHaveBeenLastCalledWith({
      action: "app_command",
      command: "toggle_overlay",
    });

    rerender(
      <PadEditor
        action={{ action: "app_command", command: "toggle_overlay" }}
        keymap={keymap}
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "Pad action" }),
    ).toHaveTextContent("Show or hide overlay");
    choose("Next layer");
    expect(onChange).toHaveBeenLastCalledWith({ action: "cycle_layer" });
  });
});
