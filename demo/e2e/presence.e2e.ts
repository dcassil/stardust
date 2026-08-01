import { test, expect, type Page } from "@playwright/test";

/**
 * PRESENCE E2E (flag ON) — colab-backed two-participant remote cursors +
 * edit-locks over a real Socket.IO relay.
 *
 * Migrated from the old server-less BroadcastChannel mock to the generic `colab`
 * collaboration packages. Requires:
 *  - `VITE_PRESENCE_ENABLED=1` on the admin dev server (the `<ColabProvider>` is
 *    only mounted when the flag is on), and
 *  - the demo `colab` relay running on :5175 (`npm run demo:presence`).
 * Both are wired by `playwright.config.ts`'s `webServer` entries.
 *
 * Because the relay fans presence out server-side (not via a same-origin
 * BroadcastChannel), two SEPARATE browser contexts both join the shared room, so
 * this uses two contexts (A, B). With the relay up:
 *  - moving the pointer over tab A's canvas makes a remote cursor
 *    (`[data-colab-cursor]`) appear in tab B, and
 *  - selecting a block in tab A makes an advisory edit-lock badge
 *    (`[data-presence-lock="hero"]`) appear in tab B.
 *
 * If the flag is off the presence layer never mounts; this spec detects that
 * (asserts the indicator) and fails loudly rather than silently passing.
 */

async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 20_000 },
  );
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
  await expect
    .poll(
      async () => {
        const b = await page.locator('[data-target-id="hero"]').boundingBox();
        return b ? Math.round(b.height) : 0;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(10);
}

test.describe("presence: colab relay two-participant cursors + edit-locks", () => {
  test("tab B sees tab A's remote cursor and edit-lock", async ({ browser }) => {
    // Two SEPARATE contexts: the colab relay fans presence out server-side, so
    // storage-partitioned contexts still converge in the shared room (unlike the
    // old BroadcastChannel mock, which required one shared context).
    const ctxA = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const ctxB = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const tabA = await ctxA.newPage();
    const tabB = await ctxB.newPage();

    try {
      await tabA.goto("/");
      await tabB.goto("/");
      await waitConnected(tabA);
      await waitConnected(tabB);

      // Guard: the flag must be ON — the sidebar indicator only mounts then.
      await expect(tabA.getByTestId("presence-indicator")).toBeVisible({
        timeout: 10_000,
      });
      await expect(tabB.getByTestId("presence-indicator")).toBeVisible({
        timeout: 10_000,
      });

      // Both tabs should observe one OTHER participant once joined to the room.
      await expect(tabB.getByTestId("presence-others")).toHaveText("1", {
        timeout: 15_000,
      });

      // Tab A: move the pointer across the hero overlay so the colab cursor
      // sampler publishes normalized points to the relay → tab B.
      const heroA = tabA.locator('[data-target-id="hero"]');
      const box = await heroA.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        await tabA.mouse.move(box.x + 10, box.y + 10);
        await tabA.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await tabA.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
      }

      // Tab B: a remote cursor from tab A appears (a tiny glyph + name pill under
      // `[data-colab-cursor]`); the layer is `pointer-events: none`, so assert
      // attachment rather than a hit-box.
      const remoteCursor = tabB.locator("[data-colab-cursor]").first();
      await expect(remoteCursor).toBeAttached({ timeout: 10_000 });

      // Tab A: select the hero item → publishes an advisory edit-lock on "hero".
      await tabA.locator(".ov-item").first().click();

      // Tab B: the edit-lock badge for "hero" appears, anchored to the hero box,
      // reading "{name} is editing".
      const lock = tabB.locator('[data-presence-lock="hero"]').first();
      await expect(lock).toBeVisible({ timeout: 10_000 });
      await expect(lock).toContainText("is editing");
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
