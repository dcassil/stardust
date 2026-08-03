/**
 * Content-store public surface.
 *
 * The demo backs the dashboard's `ContentStoreAdapter` seam with the pure
 * `versioned-content-engine`. As of SVER-T-0035 the VCE↔dashboard adapter, its
 * CmsContent payload policy, and the `localStorage` persistence all live in the
 * published `@stardust-cms/vce-adapter` package — this module is now only the
 * demo-specific composition root: it constructs the packaged
 * {@link VceContentStoreAdapter} with the CmsContent policy and browser
 * `localStorage` persistence, seeded from the shared demo content model.
 */

import {
  VceContentStoreAdapter,
  type VceAdapterOptions,
} from "@stardust-cms/vce-adapter";
import { cmsContentPayloadPolicy, type CmsContentTypeMap } from "@stardust-cms/vce-adapter/cms-content";
import { createLocalStoragePersistence } from "@stardust-cms/vce-adapter/local-storage";

import { SEED_CONTENT } from "../content-model.js";

/** The demo's concrete adapter type: the packaged adapter over the CmsContent map. */
export type DemoContentStore = VceContentStoreAdapter<CmsContentTypeMap>;
export { VceContentStoreAdapter } from "@stardust-cms/vce-adapter";

/** The `localStorage` key holding the persisted draft — kept stable so saved content survives. */
const CONTENT_KEY = "stardust-demo-content";

/** Browser `localStorage` persistence, shared by the store and the "clear content" action. */
const demoPersistence = createLocalStoragePersistence({ key: CONTENT_KEY });

/** The construction options for the demo's store: CmsContent policy + localStorage persistence. */
const demoAdapterOptions: VceAdapterOptions<CmsContentTypeMap> = {
  policy: cmsContentPayloadPolicy,
  persistence: demoPersistence,
};

/**
 * Build the demo's default store. The demo has no backend, so content is
 * persisted to `localStorage` via the packaged persistence adapter: if a previous
 * session was saved we re-seed from that working draft, otherwise we fall back to
 * the shared {@link SEED_CONTENT}. Either way the seed is published once so it is
 * the initial LIVE content; edits then accrue in a fresh draft (persisted after
 * each mutation) until published.
 */
export function createDemoContentStore(): DemoContentStore {
  const persisted = demoPersistence.load();
  return new VceContentStoreAdapter(persisted ?? SEED_CONTENT, demoAdapterOptions);
}

/** Clear persisted content so the next load falls back to the built-in seed. */
export function clearPersistedContent(): void {
  demoPersistence.clear();
}
