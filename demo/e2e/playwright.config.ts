import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the standalone demo E2E.
 *
 * The demo is its own consumer project (`demo/package.json`), so the specs run
 * with `demo/` as cwd (`npm --prefix demo run e2e`). The `webServer` entries
 * spawn the same two Vite dev servers `npm run demo` starts, on the explicit
 * localhost origins 5173 (admin) / 5174 (site), relative to the demo root.
 * `reuseExistingServer` lets a manually-started pair be reused (needed when the
 * sandbox blocks auto-spawn).
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx vite --config site/vite.config.ts site",
      url: "http://localhost:5174",
      cwd: demoRoot(),
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npx vite --config admin/vite.config.ts admin",
      url: "http://localhost:5173",
      cwd: demoRoot(),
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});

/** Demo project root (one level up from demo/e2e). */
function demoRoot(): string {
  return new URL("../", import.meta.url).pathname;
}
