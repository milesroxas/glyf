import { getAction, setKeyAction, setLabel } from "@glyf/keymap-schema";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backend } from "../../../test/fakeBackend";
import { Inspector } from "../inspector/Inspector";
import { KeymapProvider, useDesigner } from "./KeymapProvider";
import { AUTOSAVE_DELAY_MS } from "./useAutosave";

let designer: ReturnType<typeof useDesigner>;

function Probe() {
  designer = useDesigner();
  return null;
}

/** Components below the designer's loading gate expect a keymap. */
function WhenLoaded({ children }: { children: React.ReactNode }) {
  return useDesigner().keymap ? children : null;
}

async function mount(children?: React.ReactNode) {
  render(
    <KeymapProvider>
      <Probe />
      <WhenLoaded>{children}</WhenLoaded>
    </KeymapProvider>,
  );
  await waitFor(() => expect(designer.keymap).not.toBeNull());
}

const label = (text: string) => () =>
  designer.edit((keymap) => setLabel(keymap, 0, "0,1", text));

/** The label of the Chrome key on layer 0, as the designer holds it. */
function chromeLabel() {
  if (!designer.keymap) throw new Error("not loaded");
  return getAction(designer.keymap, 0, "0,1")?.label;
}

describe("KeymapProvider", () => {
  beforeEach(() => backend.reset());
  afterEach(() => vi.useRealTimers());

  it("writes a burst of edits once, after the edits stop", async () => {
    await mount();
    vi.useFakeTimers();
    act(label("A"));
    act(label("AB"));
    act(label("ABC"));
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1));
    expect(backend.saves).toHaveLength(0);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(backend.saves).toHaveLength(1);
    const [{ name, keymap }] = backend.saves;
    expect(name).toBe("Work");
    expect(getAction(keymap, 0, "0,1")?.label).toBe("ABC");
  });

  it("undoes to the previous keymap and saves it", async () => {
    await mount();
    const original = designer.keymap;
    vi.useFakeTimers();
    act(label("Changed"));
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));
    act(() => designer.undo());
    expect(designer.keymap).toBe(original);
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS));
    expect(backend.saves).toHaveLength(2);
    expect(getAction(backend.saves[1].keymap, 0, "0,1")?.label).toBe("Chrome");
  });

  it("returns to the edited key on undo", async () => {
    await mount();
    act(() => {
      designer.setLayer(2);
      designer.select("1,1");
    });
    act(() => designer.edit((keymap) => setLabel(keymap, 2, "1,1", "Pointer")));
    act(() => {
      designer.setLayer(0);
      designer.select(null);
    });
    act(() => designer.undo());
    expect([designer.layer, designer.selected]).toEqual([2, "1,1"]);
  });

  it("undoes with ⌘Z, except inside a text field", async () => {
    await mount();
    act(label("Typed"));
    const input = document.createElement("input");
    document.body.append(input);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyZ",
          metaKey: true,
          bubbles: true,
        }),
      );
    });
    expect(chromeLabel()).toBe("Typed");
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyZ", metaKey: true }),
      );
    });
    expect(chromeLabel()).toBe("Chrome");
    input.remove();
  });

  it("asks to duplicate Default, then applies the edit to the copy", async () => {
    backend.reset({}, "Default");
    await mount();
    expect(designer.profile?.readOnly).toBe(true);
    act(label("Browser"));
    expect(designer.duplicatePrompt).toBe("My keymap");
    expect(chromeLabel()).toBe("Chrome");

    await act(() => designer.confirmDuplicate("Mine"));
    expect(backend.active).toBe("Mine");
    expect(designer.profile).toEqual({ name: "Mine", readOnly: false });
    expect(chromeLabel()).toBe("Browser");
    await waitFor(() =>
      expect(backend.saves.map((save) => save.name)).toContain("Mine"),
    );
  });

  it("selects the key pressed on the pad, on the pad's layer", async () => {
    backend.hostLayer = 2;
    await mount();
    await act(() =>
      backend.emit("macro11:key-press", {
        position: { row: 1, col: 2 },
        pressed: true,
        timestamp: 0,
      }),
    );
    expect([designer.layer, designer.selected]).toEqual([2, "1,2"]);
  });

  it("warns when another key on the layer sends the same shortcut", async () => {
    await mount(<Inspector />);
    act(() => {
      designer.edit((keymap) =>
        setKeyAction(keymap, 1, "2,2", {
          action: "shortcut",
          keys: ["cmd", "t"],
        }),
      );
      designer.setLayer(1);
      designer.select("2,2");
    });
    expect(
      await screen.findByText("Key 2 (New Tab) sends the same shortcut."),
    ).toBeInTheDocument();
  });
});
