import { test, expect, type Page } from "@playwright/test";

/**
 * STYLE E2E — the sidebar `StylePanel` pushes `cms/updateStyles` to the iframe,
 * and the style lands ONLY in the site's managed adapter `<style>` (StyleFeature).
 *
 * Flow: select the hero-title block → change its color in the StylePanel →
 * assert (a) the iframe block's COMPUTED color updated, (b) the adapter's managed
 * `<style data-stardust-adapter-styles>` node now carries the group rule, and
 * (c) NO other stylesheet in the iframe document was mutated.
 *
 * The hero-title item carries `data-style-group="hero-title"` (see the shared
 * content model), so the injected rule is `[data-style-group="hero-title"]{…}`.
 */

const SITE_FRAME = 'iframe[title="Embedded site preview"]';
const ADAPTER_STYLE = "style[data-stardust-adapter-styles]";
const GROUP = "hero-title";
const TARGET_COLOR = "#ff0000";
const TARGET_RGB = "rgb(255, 0, 0)";

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

test.describe("style panel drives cms/updateStyles", () => {
  test("changing a block color updates the iframe + only the managed <style>", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    const frame = page.frameLocator(SITE_FRAME);
    const heroTitle = frame.locator(`[data-style-group="${GROUP}"]`).first();
    await expect(heroTitle).toBeVisible();

    // Snapshot the OTHER (non-adapter) stylesheets' text so we can prove they
    // were not mutated by the style update.
    const otherSheetsBefore = await page
      .frameLocator(SITE_FRAME)
      .locator("body")
      .evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(
          document.querySelectorAll("style, link[rel=stylesheet]"),
        )) {
          if (el.matches("style[data-stardust-adapter-styles]")) continue;
          out.push(el.outerHTML);
        }
        return out.join("\n");
      });

    // Select the hero title item overlay, then set the color in the StylePanel.
    await page.locator(".ov-item").first().click();
    await expect(page.getByTestId("style-panel")).toHaveAttribute(
      "data-style-group",
      GROUP,
      { timeout: 10_000 },
    );

    const colorInput = page.getByTestId("style-color");
    await expect(colorInput).toBeVisible();
    // `fill` on a color input triggers React's onChange (an imperative
    // value-set + dispatched event does NOT, since React tracks the value via
    // its own descriptor).
    await colorInput.fill(TARGET_COLOR);

    // (a) The iframe block's COMPUTED color updated.
    await expect
      .poll(
        async () =>
          heroTitle.evaluate((el) => getComputedStyle(el).color),
        { timeout: 10_000 },
      )
      .toBe(TARGET_RGB);

    // (b) The managed adapter <style> node now carries the group rule.
    const adapterCss = await page
      .frameLocator(SITE_FRAME)
      .locator(ADAPTER_STYLE)
      .first()
      .textContent();
    expect(adapterCss ?? "").toContain(`[data-style-group="${GROUP}"]`);
    expect(adapterCss ?? "").toContain("color");

    // (c) No OTHER stylesheet was mutated.
    const otherSheetsAfter = await page
      .frameLocator(SITE_FRAME)
      .locator("body")
      .evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(
          document.querySelectorAll("style, link[rel=stylesheet]"),
        )) {
          if (el.matches("style[data-stardust-adapter-styles]")) continue;
          out.push(el.outerHTML);
        }
        return out.join("\n");
      });
    expect(otherSheetsAfter).toBe(otherSheetsBefore);
  });
});
