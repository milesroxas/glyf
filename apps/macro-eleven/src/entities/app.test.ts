import { describe, expect, it } from "vitest";
import { findApp, type InstalledApp, rankApps } from "./app";

const app = (name: string, bundleId: string): InstalledApp => ({
  name,
  bundleId,
  path: `/Applications/${name}.app`,
  iconPath: null,
});

const apps = [
  app("Google Chrome", "com.google.Chrome"),
  app("Chess", "com.apple.Chess"),
  app("Calendar", "com.apple.iCal"),
  app("Photo Booth", "com.apple.PhotoBooth"),
  app("Notes", "com.apple.Notes"),
];

describe("rankApps", () => {
  it("puts a word-prefix match first for chr", () => {
    expect(rankApps(apps, "chr", []).map((a) => a.name)).toEqual([
      "Google Chrome",
    ]);
  });

  it("orders prefix, word prefix, substring, then bundle ID", () => {
    expect(rankApps(apps, "c", []).map((a) => a.name)).toEqual([
      "Calendar",
      "Chess",
      "Google Chrome",
    ]);
    expect(rankApps(apps, "oo", []).map((a) => a.name)).toEqual([
      "Google Chrome",
      "Photo Booth",
    ]);
    expect(rankApps(apps, "ical", []).map((a) => a.name)).toEqual(["Calendar"]);
  });

  it("lists recent apps first, most recent first", () => {
    const ranked = rankApps(apps, "", ["com.apple.Notes", "com.google.Chrome"]);
    expect(ranked.slice(0, 2).map((a) => a.name)).toEqual([
      "Notes",
      "Google Chrome",
    ]);
    expect(ranked[2].name).toBe("Calendar");
  });
});

describe("findApp", () => {
  it("prefers the bundle ID and falls back to the name", () => {
    expect(
      findApp(apps, { app: "Renamed", bundleId: "com.apple.Notes" })?.name,
    ).toBe("Notes");
    expect(findApp(apps, { app: "Chess" })?.bundleId).toBe("com.apple.Chess");
    expect(findApp(apps, "com.google.Chrome")?.name).toBe("Google Chrome");
    expect(findApp(apps, { app: "Figma" })).toBeUndefined();
  });
});
