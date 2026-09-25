import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/** jsdom + Testing Library, with the Tauri IPC layer replaced by a fake backend. */
export default defineConfig({
  plugins: [react()],
  test: {
    name: "macro-eleven",
    environment: "jsdom",
    setupFiles: [path.resolve(root, "./src/test/setup.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
