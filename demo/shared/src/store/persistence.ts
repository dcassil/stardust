/**
 * Browser `localStorage` persistence for the demo's content.
 *
 * The demo has no backend — the {@link VceContentStoreAdapter} is an in-memory
 * versioned engine that is otherwise re-seeded from `SEED_CONTENT` on every page
 * load, so edits, inserts, and uploaded images would vanish on reload. This
 * module gives the demo durable content by snapshotting the current DRAFT (the
 * working content, including unpublished edits) to `localStorage` after each
 * mutation and reloading it as the seed on the next boot.
 *
 * We persist the draft projection as {@link SeedItem}[] (the exact shape the
 * adapter seeds from), so a reload reconstructs the store by re-seeding from the
 * last working state. Version *history* is intentionally not preserved across
 * reloads — the reloaded content becomes a fresh published baseline — which is
 * the right trade for a demo: content survives, the engine stays simple.
 *
 * All access is guarded for non-browser / storage-disabled environments and
 * wrapped so a quota or parse failure degrades to the built-in seed rather than
 * throwing.
 */

import type { ContentPayload } from "@stardust-cms/iframe-adapter/protocol";
import type { SeedItem } from "../content-model.js";

/** `localStorage` key holding the persisted draft content (a `SeedItem[]`). */
const CONTENT_KEY = "stardust-demo-content";

/** The `localStorage` object if available in this environment, else `null`. */
function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Access itself can throw (e.g. sandboxed iframes with storage disabled).
    return null;
  }
}

/**
 * Load the persisted draft content as `SeedItem[]`, or `null` when nothing is
 * stored / the payload is unreadable (so callers fall back to `SEED_CONTENT`).
 */
export function loadPersistedSeed(): SeedItem[] | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(CONTENT_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Trust the shape we ourselves wrote; a structural mismatch throws below and
    // is caught, falling back to the built-in seed.
    return parsed as SeedItem[];
  } catch {
    return null;
  }
}

/**
 * Snapshot the current draft `ContentPayload[]` to `localStorage` as the seed for
 * the next load. Silently no-ops when storage is unavailable and swallows quota
 * errors — persistence is a convenience, never a correctness requirement.
 */
export function persistSnapshot(payloads: readonly ContentPayload[]): void {
  const store = storage();
  if (!store) return;
  const seed: SeedItem[] = payloads.map((p) => ({
    targetId: p.targetId,
    index: p.index,
    content: p.content,
  }));
  try {
    store.setItem(CONTENT_KEY, JSON.stringify(seed));
  } catch {
    // Over quota (large data-URL images) or storage disabled — leave the last
    // good snapshot in place rather than crashing the editor.
  }
}

/** Clear persisted content so the next load falls back to the built-in seed. */
export function clearPersistedContent(): void {
  storage()?.removeItem(CONTENT_KEY);
}
