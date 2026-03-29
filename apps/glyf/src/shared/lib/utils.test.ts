import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges tailwind conflicts toward the last class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
