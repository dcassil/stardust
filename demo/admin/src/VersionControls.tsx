/**
 * `VersionControls` — the minimal draft/live/publish + version-navigation UI that
 * surfaces the versioned-content-engine workflow (the whole point of the VCE
 * swap).
 *
 * It is a child of `HostShell`, so it lives inside the shell's `StoreProvider`
 * and reads the injected {@link VceContentStoreAdapter} via `useContentStore()`.
 *
 * VERSION-NAV STILL NEEDS AN EXPLICIT RE-INJECT (dashboard 0.1.2 does NOT cover
 * it): the shell re-injects on every change of the `StoreProvider` snapshot, and
 * that snapshot only advances when an op flows through `useContentStore().apply`.
 * Publish / view-live / prev / next mutate the adapter's clock / view pointer
 * DIRECTLY (`vce.publish()` / `vce.setViewVersion()`), bypassing `apply`, so the
 * provider's snapshot — and hence the shell's re-inject — does NOT fire on its
 * own. To push the newly-pinned projection into the iframe we therefore still
 * dispatch a harmless `select` op through `apply` after each nav: `apply` returns
 * a fresh `getSnapshot()` (draft, live, or the pinned historical version), which
 * the shell re-injects. This is the MINIMAL mechanism kept for version-nav — the
 * generic `HostBridgeContext`/`useReinject` plumbing the edit/delete paths used
 * is gone.
 *
 * Controls:
 *  - **Publish** — `store.publish()` advances live; then re-inject so the iframe
 *    shows the freshly published content.
 *  - **View live / draft** — pin the view to the live version (or return to the
 *    editable draft) and re-inject.
 *  - **◀ / ▶** — step through historical versions (0..live) read-only.
 */

import { useCallback, useState, type ReactNode } from "react";
import { useContentStore } from "@stardust-cms/dashboard";
import type { VceContentStoreAdapter } from "@demo/shared/store";

/** A target id guaranteed to exist in the seed — used to fire a re-inject `select`. */
const REINJECT_TARGET = "hero";

export function VersionControls(): ReactNode {
  const contentStore = useContentStore();
  const { store } = contentStore;
  const vce = store as VceContentStoreAdapter;
  const [, force] = useState(0);

  // Re-inject the store's current snapshot into the iframe by dispatching a
  // no-op `select` op through the shell's store binding. `apply` returns a fresh
  // `getSnapshot()` (draft, live, or a pinned version) which the shell re-injects
  // via `cms/sendElements`. `select` preserves the view pointer (see the
  // adapter's `apply`), so the pinned version survives. `force` re-renders this
  // control so its state readouts (live/viewing) refresh.
  const reinject = useCallback(() => {
    contentStore.apply({ kind: "select", targetId: REINJECT_TARGET });
    force((n) => n + 1);
  }, [contentStore]);

  const live = vce.liveVersion();
  const viewing = vce.viewVersion();
  const editing = viewing === null;

  const onPublish = useCallback(() => {
    vce.publish();
    vce.setViewVersion(null);
    reinject();
  }, [vce, reinject]);

  const onViewLive = useCallback(() => {
    vce.setViewVersion(live);
    reinject();
  }, [vce, live, reinject]);

  const onEditDraft = useCallback(() => {
    vce.setViewVersion(null);
    reinject();
  }, [vce, reinject]);

  const onPrev = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.max(0, current - 1));
    reinject();
  }, [vce, viewing, live, reinject]);

  const onNext = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.min(live, current + 1));
    reinject();
  }, [vce, viewing, live, reinject]);

  return (
    <section className="version-controls" data-testid="version-controls">
      <h2 className="panel__title">Versioning</h2>
      <p className="version-controls__state" data-testid="version-state">
        {editing ? "Editing draft" : `Viewing version ${String(viewing)}`}
        {" · "}live v{live}
      </p>
      <div className="version-controls__row">
        <button type="button" data-testid="publish" onClick={onPublish}>
          Publish draft
        </button>
      </div>
      <div className="version-controls__row">
        <button type="button" data-testid="view-live" onClick={onViewLive} disabled={!editing}>
          View live
        </button>
        <button type="button" data-testid="edit-draft" onClick={onEditDraft} disabled={editing}>
          Edit draft
        </button>
      </div>
      <div className="version-controls__row">
        <button type="button" data-testid="version-prev" onClick={onPrev}>
          ◀ Prev
        </button>
        <button type="button" data-testid="version-next" onClick={onNext}>
          Next ▶
        </button>
      </div>
    </section>
  );
}
