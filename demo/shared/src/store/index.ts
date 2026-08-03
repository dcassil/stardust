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
import { loadPersistedSeed } from "./persistence.js";

export { VceContentStoreAdapter } from "./VceContentStoreAdapter.js";
export { clearPersistedContent } from "./persistence.js";

/**
 * Build the demo's default store. The demo has no backend, so content is
 * persisted to `localStorage`: if a previous session was saved we re-seed from
 * that working draft, otherwise we fall back to the shared {@link SEED_CONTENT}.
 * Either way the seed is published once so it is the initial LIVE content; edits
 * then accrue in a fresh draft (persisted after each mutation) until published.
 */
export function createDemoContentStore(): VceContentStoreAdapter {
  const persisted = loadPersistedSeed();
  return new VceContentStoreAdapter(persisted ?? SEED_CONTENT, { persist: true });
}
