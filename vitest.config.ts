import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Config file location so `projects` resolve the same from repo root or `apps/glyf`. */
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Monorepo test workspace: shared domain packages + glyf app (see each vitest.config.ts).
 */
export default defineConfig({
  test: {
    projects: [
      path.join(workspaceRoot, "shared/libs/keymap-schema"),
      path.join(workspaceRoot, "shared/libs/display-schema"),
      path.join(workspaceRoot, "apps/glyf/vitest.config.ts"),
      path.join(workspaceRoot, "apps/glyf/vitest.browser.config.ts"),
    ],
  },
});
