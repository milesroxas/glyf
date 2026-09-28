import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Playwright in WebKit (the macOS webview) and Chromium, for focus and pointer cases jsdom cannot show. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    name: "macro-eleven-browser",
    // The app's styles: menus stay mounted through their exit animation
    setupFiles: [
      path.resolve(root, "./src/test/setup.ts"),
      path.resolve(root, "./src/app/App.css"),
    ],
    include: ["src/**/*.browser.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "webkit" }, { browser: "chromium" }],
    },
  },
});
