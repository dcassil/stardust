import { test, expect, type Page } from "@playwright/test";

/**
 * PRESENCE E2E (flag ON) — server-less, two-tab remote cursors + edit-locks.
 *
 * Requires `VITE_PRESENCE_ENABLED=1` on the admin dev server (the mock
 * BroadcastChannel provider is only constructed when the flag is on). Two admin
 * pages on the SAME origin share one `BroadcastChannel`, so with NO server:
 *  - moving the pointer over tab A's canvas makes a remote cursor
 *    (`[data-presence-cursor]`) appear in tab B, and
 *  - selecting a block in tab A makes an edit-lock badge
 *    (`[data-presence-lock="hero"]`) appear in tab B.
 *
 * If the flag is off the presence layer never mounts; this spec detects that and
 * fails loudly rather than silently passing, so it can't rot into a no-op.
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

test.describe("presence: server-less two-tab cursors + edit-locks", () => {
  test("tab B sees tab A's remote cursor and edit-lock", async ({ browser }) => {
    // Two TABS in ONE browser context: same-origin `BroadcastChannel` is shared
    // across tabs within a single context, so the mock (server-less) presence
    // adapter fans out between them. Separate contexts are storage-partitioned
    // and would NOT share the channel — hence one context, two pages.
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const tabA = await ctx.newPage();
    const tabB = await ctx.newPage();

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

      // Tab A: move the pointer across the hero overlay (canvas space) so a
      // throttled pointer message fans out to tab B.
      const heroA = tabA.locator('[data-target-id="hero"]');
      const box = await heroA.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        await tabA.mouse.move(box.x + 10, box.y + 10);
        await tabA.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await tabA.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
      }

      // Tab B: a remote cursor from tab A appears (the cursor marker itself is
      // a tiny dot + label; assert it is present + labeled rather than relying
      // on a non-zero hit-box, since the layer is `pointer-events: none`).
      const remoteCursor = tabB.locator("[data-presence-cursor]").first();
      await expect(remoteCursor).toBeAttached({ timeout: 10_000 });
      await expect(
        tabB.locator("[data-presence-cursor-label]").first(),
      ).toBeAttached({ timeout: 10_000 });

      // Tab A: select the hero item → publishes an advisory edit-lock on "hero".
      await tabA.locator(".ov-item").first().click();

      // Tab B: the edit-lock badge for the "hero" target appears, anchored to
      // the hero target box, reading "{name} is editing".
      const lock = tabB.locator('[data-presence-lock="hero"]').first();
      await expect(lock).toBeVisible({ timeout: 10_000 });
      await expect(lock).toContainText("is editing");
    } finally {
      await ctx.close();
    }
  });
});
