import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { demoAliases, demoDedupe } from "./shared/aliases";

/**
 * Vitest config for the standalone demo project. Runs from `demo/` as cwd, so the
 * include/setup paths are relative to the demo root. Reuses the `@demo/*` aliases
 * so the store tests resolve the shared modules the same way the apps do; the
 * published `@stardust-cms/*` + `versioned-content-engine` packages resolve from
 * `demo/node_modules`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: demoAliases,
    dedupe: demoDedupe,
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "**/dist/**", "e2e/**"],
    setupFiles: ["vitest.setup.ts"],
  },
});
