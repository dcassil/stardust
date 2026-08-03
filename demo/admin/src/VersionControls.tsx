/**
 * `VersionControls` — the minimal draft/live/publish + version-navigation UI that
 * surfaces the versioned-content-engine workflow (the whole point of the VCE
 * swap).
 *
 * It is a child of `HostShell`, so it lives inside the shell's `StoreProvider`
 * and reads the injected {@link VceContentStoreAdapter} via `useContentStore()`.
 *
 * VERSION-NAV RE-INJECTS AUTOMATICALLY (dashboard 0.1.8 + vce-adapter
 * `subscribe()`): publish / view-live / prev / next mutate the adapter's clock /
 * view pointer DIRECTLY (`vce.publish()` / `vce.setViewVersion()`), bypassing
 * `apply`. The packaged {@link VceContentStoreAdapter} notifies its subscribers
 * after every snapshot-changing operation, and the dashboard `StoreProvider`
 * subscribes and re-reads `getSnapshot()` on each notification — so the freshly
 * pinned projection re-injects into the iframe WITHOUT any synthetic `select`
 * op. The old `REINJECT_TARGET` hack that dispatched a no-op `select` purely to
 * force a re-inject is gone.
 *
 * Controls:
 *  - **Publish** — `store.publish()` advances live; then re-inject so the iframe
 *    shows the freshly published content.
 *  - **View live / draft** — pin the view to the live version (or return to the
 *    editable draft) and re-inject.
 *  - **◀ / ▶** — step through historical versions (0..live) read-only.
 */

import { useCallback, type ReactNode } from "react";
import { useContentStore } from "@stardust-cms/dashboard";
import type { DemoContentStore } from "@demo/shared/store";
import { useEditable } from "./editableContext";

export function VersionControls(): ReactNode {
  const { store, snapshot } = useContentStore();
  // Narrow to the demo's concrete adapter for its versioning capabilities
  // (`liveVersion` / `viewVersion` / `publish` / `setViewVersion`), which the
  // generic `ContentStoreAdapter` seam exposes only optionally.
  const vce = store as DemoContentStore;
  const { setEditable } = useEditable();

  // The adapter's `subscribe()` seam re-injects the freshly pinned projection
  // into the iframe automatically (dashboard 0.1.8 `StoreProvider`), and the
  // provider's `snapshot` state change re-renders this control — so after a view
  // change we only need to sync the shared editable flag so the WHOLE editor
  // (HostShell / Overlays / Palette) reacts to draft-vs-preview, not just this
  // control. `snapshot` is read below purely to depend on provider re-renders.
  void snapshot;
  const syncEditable = useCallback(() => {
    setEditable(vce.viewVersion() === null);
  }, [vce, setEditable]);

  const live = vce.liveVersion();
  const viewing = vce.viewVersion();
  const editing = viewing === null;

  const onPublish = useCallback(() => {
    vce.publish();
    vce.setViewVersion(null);
    syncEditable();
  }, [vce, syncEditable]);

  const onViewLive = useCallback(() => {
    vce.setViewVersion(live);
    syncEditable();
  }, [vce, live, syncEditable]);

  const onEditDraft = useCallback(() => {
    vce.setViewVersion(null);
    syncEditable();
  }, [vce, syncEditable]);

  const onPrev = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.max(0, current - 1));
    syncEditable();
  }, [vce, viewing, live, syncEditable]);

  const onNext = useCallback(() => {
    const current = viewing ?? live;
    vce.setViewVersion(Math.min(live, current + 1));
    syncEditable();
  }, [vce, viewing, live, syncEditable]);

  return (
    <section className="panel version-controls" data-testid="version-controls">
      <div className="panel__head">
        <h2 className="panel__title">Versioning</h2>
        <span className={`vc-pill ${editing ? "vc-pill--draft" : "vc-pill--live"}`}>
          {editing ? "Draft" : "Preview"}
        </span>
      </div>
      {/* `version-state` carries the canonical status text the e2e suite asserts
          on ("Editing draft" / "Viewing version N" / "live vN"), presented as
          clean product copy. */}
      <p className="version-controls__state" data-testid="version-state">
        {editing ? "Editing draft" : `Viewing version ${String(viewing)}`}
        {" · "}live v{live}
      </p>

      <button
        type="button"
        className="btn btn--primary btn--block"
        data-testid="publish"
        onClick={onPublish}
      >
        Publish draft
      </button>

      <div className="btn-group">
        <button
          type="button"
          className="btn"
          data-testid="view-live"
          onClick={onViewLive}
          disabled={!editing}
        >
          View live
        </button>
        <button
          type="button"
          className="btn"
          data-testid="edit-draft"
          onClick={onEditDraft}
          disabled={editing}
        >
          Edit draft
        </button>
      </div>

      <div className="vc-nav">
        <span className="vc-nav__label">Browse history</span>
        <span className="vc-nav__buttons">
          <button
            type="button"
            className="btn btn--icon"
            data-testid="version-prev"
            onClick={onPrev}
            aria-label="Previous version"
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn--icon"
            data-testid="version-next"
            onClick={onNext}
            aria-label="Next version"
          >
            ›
          </button>
        </span>
      </div>
    </section>
  );
}
