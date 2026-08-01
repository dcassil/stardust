import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Demo E2E against the dashboard-`HostShell`-based admin + the VCE-backed store.
 *
 * Covers the initiative's headline behaviors end to end:
 *  1. overlay geometry stays aligned to targets under resize + iframe scroll;
 *  2. editing a selected block's field updates the iframe content live;
 *  3. CRITICAL — dragging a palette block onto a target ACTUALLY INSERTS content
 *     that renders in the iframe (the previously-broken stale-callback path; the
 *     dashboard shell owns its own pipeline, so insert must work now);
 *  4. publish + version navigation surface the VCE workflow.
 *
 * Site content items render as `<div id={collectionId} data-cms-content>` inside
 * `<div id={targetId}>`. Admin markup uses the dashboard's `ov-*` overlay
 * classes, the `admin-status[data-state]` strip, `palette__item`, the side-panel
 * `panel-text` field, and the `version-controls` testids.
 */

const SITE_FRAME = 'iframe[title="Embedded site preview"]';
const TOL = 3;

async function waitConnected(page: Page): Promise<void> {
  await expect(page.locator(".admin-status")).toHaveAttribute(
    "data-state",
    "connected",
    { timeout: 20_000 },
  );
  await expect(page.locator('[data-target-id="hero"]')).toBeVisible();
  // Wait until the hero overlay has received streamed geometry (a non-zero box),
  // so downstream `boundingBox()` calls resolve rather than waiting for stability.
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

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error("no bounding box");
  return b;
}

async function expectAligned(page: Page, targetId: string): Promise<void> {
  const overlay = await boxOf(page.locator(`[data-target-id="${targetId}"]`));
  const inFrame = await boxOf(
    page.frameLocator(SITE_FRAME).locator(`#${cssEscape(targetId)}`),
  );
  expect(Math.abs(overlay.x - inFrame.x)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.y - inFrame.y)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.width - inFrame.width)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(overlay.height - inFrame.height)).toBeLessThanOrEqual(TOL);
}

/** Text content items rendered inside a site target. */
function targetItems(page: Page, targetId: string): Locator {
  return page
    .frameLocator(SITE_FRAME)
    .locator(`#${cssEscape(targetId)} [data-cms-content]`);
}

function cssEscape(id: string): string {
  return id.replace(/\./g, "\\.");
}

/**
 * Native HTML5 drag-and-drop: Playwright's `dragTo` emulates mouse moves, which
 * the library's `dragover`/`drop` handlers (which read a shared `DataTransfer`)
 * do not observe. This dispatches the real `dragstart`→`dragover`→`drop`
 * sequence through one shared `DataTransfer`, so the app's own `onDragStart`
 * (sets the block `type`) and `onDrop` (reads it → insert op) run.
 */
async function dndPaletteToTarget(
  page: Page,
  blockType: string,
  targetId: string,
): Promise<void> {
  const source = page.getByTestId(`palette-item-${blockType}`);
  const target = page.locator(`[data-target-id="${cssEscape(targetId)}"]`);
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer: dt });
  await target.dispatchEvent("dragover", { dataTransfer: dt });
  await target.dispatchEvent("drop", { dataTransfer: dt });
  await source.dispatchEvent("dragend", { dataTransfer: dt });
}

test.describe("dashboard host shell + VCE store", () => {
  test("overlays align to targets and stay aligned under resize and scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    for (const id of ["hero", "intro", "showcase", "features"]) {
      await expectAligned(page, id);
    }
    await expectAligned(page, "split-col.1");

    await page.setViewportSize({ width: 980, height: 900 });
    await page.waitForTimeout(500);
    await expectAligned(page, "hero");
    await expectAligned(page, "features");

    await page
      .frameLocator(SITE_FRAME)
      .locator("body")
      .evaluate(() => window.scrollTo(0, 250));
    await page.waitForTimeout(500);
    await expectAligned(page, "features");
  });

  test("editing the selected hero text updates the iframe content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    // Select the first item overlay (the hero title).
    await page.locator(".ov-item").first().click();

    const field = page.getByTestId("panel-text");
    await expect(field).toBeVisible({ timeout: 10_000 });
    const NEW_TEXT = "E2E LIVE EDIT";
    await field.fill(NEW_TEXT);

    await expect(targetItems(page, "hero").first()).toHaveText(NEW_TEXT, {
      timeout: 10_000,
    });
  });

  test("dragging a palette block onto a target inserts content that renders", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    const introItems = targetItems(page, "intro");
    const before = await introItems.count();

    await dndPaletteToTarget(page, "text", "intro");

    // A new text block ("New text block") renders in the iframe intro target.
    await expect(introItems).toHaveCount(before + 1, { timeout: 10_000 });
    await expect(
      introItems.filter({ hasText: "New text block" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("drag-over surfaces the target tint + an active insertion zone at the drop index, and dropping inserts there", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    const introItems = targetItems(page, "intro");
    const before = await introItems.count();
    expect(before).toBeGreaterThan(0); // intro is non-empty → top/bottom zones

    const source = page.getByTestId("palette-item-text");
    const target = page.locator('[data-target-id="intro"]');
    // Share one DataTransfer across the whole native HTML5 sequence so the
    // library's enter/leave counter + zone activation observe a real drag.
    const dt = await page.evaluateHandle(() => new DataTransfer());

    await source.dispatchEvent("dragstart", { dataTransfer: dt });
    await target.dispatchEvent("dragenter", { dataTransfer: dt });
    await target.dispatchEvent("dragover", { dataTransfer: dt });

    // (a) whole-area drag-over marker is present on the target.
    await expect(target).toHaveAttribute("data-dragover", "");

    // Activate the FIRST item's "top" zone (insertion index 0) by dispatching
    // dragover onto that specific zone, then assert it becomes the active bar
    // at the expected data-drop-index.
    const topZone = page
      .locator('[data-target-id="intro"] [data-drop-zone="top"]')
      .first();
    await topZone.dispatchEvent("dragover", { dataTransfer: dt });

    const activeZone = page.locator(
      '[data-target-id="intro"] [data-drop-zone][data-drop-active]',
    );
    await expect(activeZone).toHaveCount(1);
    await expect(activeZone).toHaveAttribute("data-drop-zone", "top");
    await expect(activeZone).toHaveAttribute("data-drop-index", "0");

    // (b) dropping on that active zone inserts at index 0 and renders in-frame.
    await topZone.dispatchEvent("drop", { dataTransfer: dt });
    await source.dispatchEvent("dragend", { dataTransfer: dt });

    await expect(introItems).toHaveCount(before + 1, { timeout: 10_000 });
    await expect(introItems.first()).toHaveText("New text block", {
      timeout: 10_000,
    });
  });

  test("publish and version navigation drive the VCE workflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitConnected(page);
    await page.waitForTimeout(500);

    const state = page.getByTestId("version-state");
    await expect(state).toContainText("Editing draft");
    await expect(state).toContainText("live v1");

    // Insert into the draft so draft differs from live.
    await dndPaletteToTarget(page, "text", "features");
    await page.waitForTimeout(300);

    // Publish: live advances to v2.
    await page.getByTestId("publish").click();
    await expect(state).toContainText("live v2", { timeout: 10_000 });

    // Navigate to a previous version (read-only), then back to the draft.
    await page.getByTestId("version-prev").click();
    await expect(state).toContainText("Viewing version", { timeout: 10_000 });
    await page.getByTestId("edit-draft").click();
    await expect(state).toContainText("Editing draft", { timeout: 10_000 });
  });
});
