import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { backend } from "../../test/fakeBackend";
import { SettingsView } from "./SettingsView";

async function openPane(name: "General" | "Overlay") {
  render(<SettingsView />);
  const tab = await screen.findByRole("tab", { name });
  // Radix tabs select on mouse down
  fireEvent.mouseDown(tab);
  await waitFor(() => expect(tab).toHaveAttribute("data-state", "active"));
}

describe("Settings", () => {
  beforeEach(() => {
    backend.reset();
    localStorage.clear();
  });

  it("applies a switch at once", async () => {
    await openPane("General");
    const dock = await screen.findByRole("switch", { name: "Show in Dock" });
    expect(dock).toBeChecked();
    fireEvent.click(dock);
    await waitFor(() => expect(backend.settings.dockIcon).toBe(false));
    expect(dock).not.toBeChecked();
  });

  it("keeps a way back when the menu bar icon is hidden", async () => {
    await openPane("General");
    fireEvent.click(
      await screen.findByRole("switch", { name: "Show in menu bar" }),
    );
    await waitFor(() => expect(backend.settings.menuBarIcon).toBe(false));
    expect(
      screen.getByRole("switch", { name: "Show the layer name" }),
    ).toBeDisabled();
    // The Dock icon is the way back now, so it can't be turned off
    const dock = screen.getByRole("switch", { name: "Show in Dock" });
    expect(dock).toBeChecked();
    expect(dock).toBeDisabled();
    expect(screen.getByText(/choose Quit from the Dock icon/)).toBeVisible();
  });

  it("turns on Open at Login through macOS", async () => {
    await openPane("General");
    const login = await screen.findByRole("switch", { name: "Open at login" });
    await waitFor(() => expect(login).toBeEnabled());
    fireEvent.click(login);
    await waitFor(() => expect(backend.login).toBe("enabled"));
  });

  it("offers System Settings when Accessibility is missing", async () => {
    backend.accessibility = false;
    await openPane("General");
    expect(
      await screen.findByRole("button", { name: "Open System Settings…" }),
    ).toBeVisible();
  });

  it("keeps the overlay behavior in its own pane", async () => {
    await openPane("Overlay");
    const onTop = await screen.findByRole("switch", {
      name: "Keep on top of other windows",
    });
    fireEvent.click(onTop);
    await waitFor(() => expect(backend.settings.overlayOnTop).toBe(false));
  });

  it("puts the overlay back where it started", async () => {
    await openPane("Overlay");
    fireEvent.click(await screen.findByRole("button", { name: "Reset" }));
    await waitFor(() => expect(backend.calls).toContain("reset_overlay_frame"));
  });

  it("switches the overlay to a solid background", async () => {
    await openPane("Overlay");
    fireEvent.click(await screen.findByRole("radio", { name: "Solid" }));
    await waitFor(() => expect(backend.settings.overlayMaterial).toBe("solid"));
    // Transparency only applies to glass
    expect(
      screen.getByRole("slider", { name: "Transparency" }),
    ).toHaveAttribute("data-disabled");
  });

  it("refuses an overlay shortcut that would take over typing", async () => {
    await openPane("Overlay");
    const field = await screen.findByRole("button", {
      name: /Overlay shortcut/,
    });
    fireEvent.click(field);
    fireEvent.keyDown(field, { code: "KeyO", key: "o" });
    fireEvent.keyUp(field, { code: "KeyO", key: "o" });
    expect(await screen.findAllByText(/Include ⌘, ⌥, or ⌃/)).not.toHaveLength(
      0,
    );
    expect(backend.settings.overlayShortcut).toEqual([]);
  });

  it("saves an overlay shortcut", async () => {
    await openPane("Overlay");
    const field = await screen.findByRole("button", {
      name: /Overlay shortcut/,
    });
    fireEvent.click(field);
    fireEvent.keyDown(field, {
      code: "KeyO",
      key: "o",
      altKey: true,
      metaKey: true,
    });
    fireEvent.keyUp(field, {
      code: "KeyO",
      key: "o",
      altKey: true,
      metaKey: true,
    });
    await waitFor(() =>
      expect(backend.settings.overlayShortcut).toEqual(["option", "cmd", "o"]),
    );
    // While it recorded, the saved shortcut was paused
    expect(backend.calls).toContain("pause_overlay_shortcut");
  });
});
