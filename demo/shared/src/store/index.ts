/**
 * Content-store public surface.
 *
 * The demo backs the dashboard's `ContentStoreAdapter` seam with the pure
 * `versioned-content-engine` (see {@link VceContentStoreAdapter}). The old
 * in-memory store + bespoke `ContentStore` interface are gone: the dashboard now
 * owns the interface (`ContentStoreAdapter`, `HostContentOp`) and the ops→store→
 * inject pipeline, so this module only constructs the VCE-backed adapter, seeded
 * from the shared demo content model.
 */

import { SEED_CONTENT } from "../content-model.js";
import { VceContentStoreAdapter } from "./VceContentStoreAdapter.js";

export { VceContentStoreAdapter } from "./VceContentStoreAdapter.js";

/**
 * Build the demo's default store, seeded with the shared {@link SEED_CONTENT} and
 * backed by the versioned content engine. The seed is published once so it is the
 * initial LIVE content; edits then accrue in a fresh draft until published.
 */
export function createDemoContentStore(): VceContentStoreAdapter {
  return new VceContentStoreAdapter(SEED_CONTENT);
}
