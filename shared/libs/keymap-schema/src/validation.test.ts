import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "./defaults";
import { assertKeymap, KeymapValidationError } from "./validation";

/** Shared with the Rust host's validation tests. */
const FIXTURES = join(import.meta.dirname, "..", "fixtures");

function fixtures(kind: "valid" | "invalid") {
  const dir = join(FIXTURES, kind);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => [
      file,
      JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown,
    ]);
}

describe("assertKeymap", () => {
  it("accepts the bundled default keymap", () => {
    expect(() => assertKeymap(MACRO_ELEVEN_DEFAULT_KEYMAP)).not.toThrow();
  });

  it.each(fixtures("valid"))("accepts %s", (_file, keymap) => {
    expect(() => assertKeymap(keymap)).not.toThrow();
  });

  it.each(fixtures("invalid"))("rejects %s", (_file, keymap) => {
    expect(() => assertKeymap(keymap)).toThrow(KeymapValidationError);
  });

  it("rejects non-objects", () => {
    expect(() => assertKeymap(null)).toThrow(KeymapValidationError);
    expect(() => assertKeymap([])).toThrow(KeymapValidationError);
  });

  it("names the key and layer in the message", () => {
    expect(() =>
      assertKeymap({
        version: "1",
        name: "x",
        layers: {
          0: {
            name: "Base",
            keys: { "0,0": { action: "switch_layer", layer: 4 } },
          },
        },
      }),
    ).toThrow("Key 0,0 on layer 0 switches to layer 4, which does not exist");
  });
});
