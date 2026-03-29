import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "keymap-schema",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
