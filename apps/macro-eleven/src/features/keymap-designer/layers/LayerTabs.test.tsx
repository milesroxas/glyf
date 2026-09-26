import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "../../../shared/ui/tooltip";
import { backend } from "../../../test/fakeBackend";
import { KeymapProvider, useDesigner } from "../model/KeymapProvider";
import { LayerTabs } from "./LayerTabs";

function WhenLoaded({ children }: { children: React.ReactNode }) {
  return useDesigner().keymap ? children : null;
}

async function mount() {
  render(
    <TooltipProvider>
      <KeymapProvider>
        <WhenLoaded>
          <LayerTabs />
        </WhenLoaded>
      </KeymapProvider>
    </TooltipProvider>,
  );
  await screen.findByRole("tablist");
}

const tab = (name: string) => screen.getByRole("tab", { name });
const settings = (layer: string) =>
  screen.queryByRole("dialog", { name: `Settings for ${layer}` });

describe("LayerTabs", () => {
  beforeEach(() => backend.reset());

  it("opens a layer's settings from a right-click on its tab", async () => {
    await mount();
    const chrome = tab("Chrome Shortcuts");
    fireEvent.pointerDown(chrome, { button: 2 });
    fireEvent.contextMenu(chrome);
    const dialog = await waitFor(() => {
      const found = settings("Chrome Shortcuts");
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    expect(chrome).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByLabelText("Layer name")).toHaveValue(
      "Chrome Shortcuts",
    );
  });

  it("opens and closes the settings from the active tab's chevron", async () => {
    await mount();
    const active = tab("App Launcher");
    const chevron = active.querySelector("[data-layer-settings]");
    if (!chevron) throw new Error("the active tab has no chevron");
    fireEvent.click(chevron);
    await waitFor(() => expect(settings("App Launcher")).not.toBeNull());
    fireEvent.click(chevron);
    await waitFor(() => expect(settings("App Launcher")).toBeNull());
  });

  it("opens the settings with Return and gives focus back on Escape", async () => {
    await mount();
    const active = tab("App Launcher");
    active.focus();
    fireEvent.keyDown(active, { key: "Enter" });
    const name = await screen.findByLabelText("Layer name");
    await waitFor(() => expect(name).toHaveFocus());
    fireEvent.keyDown(name, { key: "Escape" });
    await waitFor(() => expect(settings("App Launcher")).toBeNull());
    expect(active).toHaveFocus();
  });
});
