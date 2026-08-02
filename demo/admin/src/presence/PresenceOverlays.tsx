/**
 * `PresenceOverlays` — the `colab`-backed presence overlay layer, rendered by the
 * shell's `renderOverlayChrome` alongside the editing `<Overlays>`.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no merge. Mounted ONLY when the
 * presence flag is enabled (i.e. inside `<ColabProvider>`); the disabled path
 * never renders it.
 *
 * COORDINATE MODEL — the `colab` cursor chain is transform-agnostic and works in
 * a NORMALIZED 0..1 space relative to the enclosing `<ColabStage>`:
 *  - `<ColabStage>` fills this layer (which the shell sizes to the scaled
 *    canvas — `.admin-canvas`, i.e. `designSize × scale`), so its measured box
 *    IS the on-screen scaled-iframe box. Because the box is already the SCALED
 *    canvas, the normalized 0..1 math is inherently scale-correct: no explicit
 *    scale factor is needed — `(clientX - box.left) / box.width` folds the iframe
 *    scale in, since `box.width === designWidth × scale`. The layer also spans
 *    the WHOLE canvas (nav, hero, footer, empty gaps), so cursors are captured
 *    and rendered everywhere over the page, not only over editable targets.
 *  - The local pointer is sampled at the DOCUMENT level and normalized against
 *    the LIVE canvas rect (see `useDocumentCursorCapture`).
 *  - `<RemoteCursors>` projects each remote normalized point back to
 *    `point * stageBox` — the only screen-space math — landing cursors over the
 *    canvas exactly where each peer pointed, regardless of anyone's scale.
 *
 * SCROLL — `.admin-canvas` lives inside the scrollable `.admin-canvas-scroll`.
 * colab-ui's `<ColabStage>` only re-measures its box on ResizeObserver (size),
 * NOT on scroll, so the cached box's viewport `left/top` go stale once the canvas
 * scrolls — which would offset every CAPTURED point. We therefore measure the
 * canvas rect LIVE inside the pointermove handler rather than trusting the cached
 * box, so capture stays correct at any scroll position. The RENDER side needs no
 * scroll correction: remote cursors are absolutely positioned INSIDE this layer,
 * which scrolls WITH the canvas, so the content-relative `point × box.size`
 * offset already tracks the content through scroll (and `box.size` is scroll-
 * invariant, kept fresh by the ResizeObserver).
 *
 * EDIT LOCKS — the shell hands us `targets` whose `geometry` (and each child
 * item's `geometry`) is ALREADY projected into canvas pixels. Locks are keyed per
 * CONTENT ITEM (`${targetId}::${contentId}`), so we read the reconciled lock owner
 * for each child item from the `colab` `EditLock` interaction (`lockedBy`
 * selector) and render a "{name} is editing" badge + highlight anchored to that
 * ITEM's already-mapped box — showing exactly which item a peer is editing, not
 * the whole target area.
 */

import { useEffect, useRef, type ReactElement } from "react";
import {
  ColabStage,
  Cursor,
  RemoteCursors,
  usePresence,
  useInteraction,
} from "colab-ui/react";
import {
  EditLock,
  type EditLockSelectors,
  type EditLockState,
} from "colab-ui";
import type { Participant } from "colab-protocol";
import type { MappedTarget } from "@stardust-cms/iframe-adapter/host";
import { contentScopeId } from "./usePresenceSession";

export interface PresenceOverlaysProps {
  targets: MappedTarget[];
  /** The local participant id, so self-held locks are not badged. */
  selfId: string;
}

export function PresenceOverlays({
  targets,
  selfId,
}: PresenceOverlaysProps): ReactElement {
  // `<ColabStage>` force-sets `position: relative` on its own element (dropping
  // any `absolute`/`inset` we pass), so it can't itself be the fill layer. Wrap
  // it in an absolutely-positioned, `pointer-events: none` layer over the canvas
  // and let the stage fill that wrapper — the stage box then measures the full
  // canvas, which the normalized cursor math + `<RemoteCursors>` depend on.
  // Ref to THIS full-bleed layer. Its rect equals the scaled `.admin-canvas`
  // box (it is `inset: 0` over it), so we measure it live for scroll-correct
  // capture without trusting colab-ui's scroll-stale cached stage box.
  const layerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={layerRef}
      className="presence-layer"
      data-presence-layer
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ColabStage style={{ width: "100%", height: "100%" }}>
        <StageContents targets={targets} selfId={selfId} layerRef={layerRef} />
      </ColabStage>
    </div>
  );
}

interface StageContentsProps {
  targets: MappedTarget[];
  selfId: string;
  layerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * The presence content rendered INSIDE `<ColabStage>`, so `useCursorCapture` /
 * `<RemoteCursors>` (which read the stage context via `useColabStage`) resolve.
 */
function StageContents({
  targets,
  selfId,
  layerRef,
}: StageContentsProps): ReactElement {
  // Publish the local pointer as a normalized cursor sample.
  useDocumentCursorCapture(layerRef);

  return (
    <>
      <RemoteCursors />
      <EditLockLayer targets={targets} selfId={selfId} />
    </>
  );
}

/**
 * Capture the local pointer at the DOCUMENT level and publish it through the
 * `colab` `Cursor` interaction as a normalized (0..1) point relative to the
 * `<ColabStage>` box.
 *
 * WHY NOT `useCursorCapture`: colab-ui's built-in capture samples via the
 * `<ColabStage>` element's own React `onPointerMove`, which never fires while the
 * stage stays `pointer-events: none`. The presence layer MUST stay
 * `pointer-events: none` so it never steals clicks from the editing overlays
 * beneath it. A document-level listener normalized against the LIVE canvas rect
 * reproduces the same normalized sample stream without capturing pointer events —
 * the neutral, transform-agnostic point the `Cursor` interaction expects. Because
 * the listener is document-level, it fires over the WHOLE page (nav, hero,
 * footer, empty gaps), so movement everywhere is broadcast — not only over
 * editable targets.
 *
 * WHY A LIVE RECT (not the cached stage box): colab-ui re-measures the stage box
 * only on ResizeObserver, never on scroll, so the cached box's viewport `left`/
 * `top` go stale the moment `.admin-canvas-scroll` scrolls — offsetting every
 * captured point. Reading `layerRef.current.getBoundingClientRect()` per move
 * always reflects the current scroll position. `clientX/clientY` are viewport-
 * relative and so is the rect, so scroll cancels cleanly; dividing by the rect's
 * (already scaled) width/height folds the iframe scale in, so capture is correct
 * at any scroll + scale.
 */
function useDocumentCursorCapture(
  layerRef: React.RefObject<HTMLDivElement | null>,
): void {
  const { send } = useInteraction(Cursor);

  useEffect(() => {
    const onMove = (event: PointerEvent): void => {
      const element = layerRef.current;
      if (element === null) return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return;
      send({ x, y });
    };
    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
    };
  }, [layerRef, send]);
}

interface EditLockLayerProps {
  targets: MappedTarget[];
  selfId: string;
}

/**
 * Render an "{name} is editing" badge + highlight per CONTENT ITEM that a REMOTE
 * participant holds a lock on, anchored to that ITEM's already-mapped canvas box.
 * Items with no remote lock owner (or a self-held lock) show nothing.
 */
function EditLockLayer({ targets, selfId }: EditLockLayerProps): ReactElement {
  const { selectors } = useInteraction<EditLockState, EditLockSelectors>(
    EditLock,
  );
  const roster = usePresence();

  return (
    <>
      {targets.flatMap((target) =>
        target.children.map((child) => {
          const scopeId = contentScopeId(target.targetId, child.contentId);
          if (scopeId === null) return null;
          const owner = selectors.lockedBy(scopeId);
          // Skip unlocked items and locks the LOCAL participant holds (you don't
          // badge your own edit). colab-server's ROSTER includes self, so the
          // self check is explicit rather than an "absent from roster" inference.
          if (!owner || owner === selfId) return null;
          const participant = roster.find((p: Participant) => p.id === owner);
          if (!participant) return null;
          const box = child.geometry;
          const key = `${target.targetId}::${child.contentId}`;
          return (
            <div
              key={key}
              className="presence-lock-item"
              data-presence-lock={key}
              style={{
                position: "absolute",
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
                border: `2px solid ${participant.color}`,
                borderRadius: 4,
                boxSizing: "border-box",
                pointerEvents: "none",
              }}
            >
              <span
                className="presence-lock"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: "translateY(-100%)",
                  padding: "2px 6px",
                  fontSize: 11,
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  color: "#fff",
                  background: participant.color,
                  pointerEvents: "none",
                }}
              >
                {participant.name} is editing
              </span>
            </div>
          );
        }),
      )}
    </>
  );
}
