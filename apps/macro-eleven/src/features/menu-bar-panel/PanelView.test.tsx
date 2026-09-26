import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { backend } from "../../test/fakeBackend";
import { PanelView } from "./PanelView";

function gaming() {
  return { ...structuredClone(MACRO_ELEVEN_DEFAULT_KEYMAP), name: "Gaming" };
}

describe("Menu bar panel", () => {
  beforeEach(() => backend.reset({ Gaming: gaming() }));

  it("switches the profile with one click", async () => {
    render(<PanelView />);
    const work = await screen.findByRole("radio", { name: "Work" });
    expect(work).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Gaming" }));
    await waitFor(() => expect(backend.active).toBe("Gaming"));
    expect(screen.getByRole("radio", { name: "Gaming" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows and hides the overlay", async () => {
    render(<PanelView />);
    const overlay = await screen.findByRole("switch", { name: "Show Overlay" });
    fireEvent.click(overlay);
    await waitFor(() => expect(backend.settings.overlayVisible).toBe(true));
  });

  it("closes on Escape, like a menu", async () => {
    render(<PanelView />);
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    expect(backend.calls).toContain("hide_panel");
  });

  it("opens Settings and quits from its items", async () => {
    render(<PanelView />);
    fireEvent.click(await screen.findByRole("button", { name: /Settings…/ }));
    fireEvent.click(screen.getByRole("button", { name: /Quit Macro Eleven/ }));
    expect(backend.calls).toEqual(
      expect.arrayContaining(["show_settings_window", "quit_app"]),
    );
  });

  it("explains itself once, after the designer first closes", async () => {
    render(<PanelView />);
    await screen.findByRole("dialog");
    await act(() =>
      backend.emit("macro11:panel-shown", { tip: true, backdrop: "glass" }),
    );
    // Present at once; its height and opacity animate in
    expect(
      await screen.findByText("Macro Eleven is still running"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Macro Eleven is still running"),
      ).not.toBeInTheDocument(),
    );
  });

  it("asks for Accessibility when shortcuts can't reach other apps", async () => {
    backend.accessibility = false;
    render(<PanelView />);
    expect(
      await screen.findByText("Allow Accessibility Access…"),
    ).toBeVisible();
  });

  it("offers a firmware update when one is ready", async () => {
    backend.firmware = { ...backend.firmware, updateAvailable: true };
    render(<PanelView />);
    await screen.findByRole("dialog");
    await act(() =>
      backend.emit("macro11:panel-shown", {
        tip: false,
        backdrop: "glass",
      }),
    );
    fireEvent.click(await screen.findByText("Update Firmware…"));
    expect(backend.calls).toContain("show_main_window");
  });
});
