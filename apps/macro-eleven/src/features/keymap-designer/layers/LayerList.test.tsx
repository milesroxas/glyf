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
import { DesignerTitle } from "../DesignerToolbar";
import { KeymapProvider, useDesigner } from "../model/KeymapProvider";
import { LayerList } from "./LayerList";
import { LayerSettingsProvider } from "./LayerSettings";

function WhenLoaded({ children }: { children: React.ReactNode }) {
  return useDesigner().keymap ? children : null;
}

async function mount() {
  render(
    <TooltipProvider>
      <KeymapProvider>
        <LayerSettingsProvider>
          <WhenLoaded>
            <DesignerTitle />
            <LayerList />
          </WhenLoaded>
        </LayerSettingsProvider>
      </KeymapProvider>
    </TooltipProvider>,
  );
  await screen.findByRole("tablist");
}

const row = (name: string) => screen.getByRole("tab", { name });
const settings = (layer: string) =>
  screen.queryByRole("dialog", { name: `Settings for ${layer}` });

describe("LayerList", () => {
  beforeEach(() => backend.reset());

  it("opens a layer's settings from a right-click on its row", async () => {
    await mount();
    const chrome = row("Chrome Shortcuts");
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

  it("opens and closes the settings from the title", async () => {
    await mount();
    const title = screen.getByRole("button", { name: "App Launcher" });
    fireEvent.click(title);
    await waitFor(() => expect(settings("App Launcher")).not.toBeNull());
    fireEvent.click(title);
    await waitFor(() => expect(settings("App Launcher")).toBeNull());
  });

  it("opens the settings with Return and gives focus back on Escape", async () => {
    await mount();
    const active = row("App Launcher");
    active.focus();
    fireEvent.keyDown(active, { key: "Enter" });
    const name = await screen.findByLabelText("Layer name");
    await waitFor(() => expect(name).toHaveFocus());
    fireEvent.keyDown(name, { key: "Escape" });
    await waitFor(() => expect(settings("App Launcher")).toBeNull());
    expect(active).toHaveFocus();
  });

  it("moves between layers with the arrow keys", async () => {
    await mount();
    fireEvent.keyDown(row("App Launcher"), { key: "ArrowDown" });
    const chrome = row("Chrome Shortcuts");
    expect(chrome).toHaveAttribute("aria-selected", "true");
    expect(chrome).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Chrome Shortcuts" }),
    ).toBeVisible();
  });

  it("numbers the layers in ⌘-shortcut order", async () => {
    await mount();
    expect(row("App Launcher")).toHaveAttribute("aria-keyshortcuts", "Meta+1");
    expect(row("Chrome Shortcuts")).toHaveAttribute(
      "aria-keyshortcuts",
      "Meta+2",
    );
  });
});
