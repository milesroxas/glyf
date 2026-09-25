import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import { describe, expect, it } from "vitest";
import type { InstalledApp } from "../../../entities/app";
import { defaultLayerAction, launchAction } from "./keyActions";

const figma: InstalledApp = {
  name: "Figma",
  bundleId: "com.figma.Desktop",
  path: "/Applications/Figma.app",
  iconPath: null,
};

describe("launchAction", () => {
  it("keeps the label when a key becomes an app key", () => {
    expect(
      launchAction(figma, {
        action: "shortcut",
        keys: ["cmd", "t"],
        label: "Design",
      }),
    ).toEqual({
      action: "launch_app",
      app: "Figma",
      bundleId: "com.figma.Desktop",
      label: "Design",
    });
  });

  it("drops the old app's label and keeps background opening", () => {
    expect(
      launchAction(figma, {
        action: "launch_app",
        app: "Google Chrome",
        label: "Chrome",
        focusIfRunning: false,
      }),
    ).toEqual({
      action: "launch_app",
      app: "Figma",
      bundleId: "com.figma.Desktop",
      focusIfRunning: false,
    });
  });
});

describe("defaultLayerAction", () => {
  it("targets the first other layer", () => {
    expect(defaultLayerAction(MACRO_ELEVEN_DEFAULT_KEYMAP, 0)).toEqual({
      action: "switch_layer",
      layer: 1,
    });
  });

  it("cycles when there is no other layer", () => {
    const single = {
      ...MACRO_ELEVEN_DEFAULT_KEYMAP,
      layers: { 0: MACRO_ELEVEN_DEFAULT_KEYMAP.layers[0] },
    };
    expect(defaultLayerAction(single, 0)).toEqual({ action: "cycle_layer" });
  });
});
