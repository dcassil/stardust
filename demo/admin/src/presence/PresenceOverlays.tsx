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
 *    IS the on-screen scaled-iframe box.
 *  - The local pointer now arrives from the IFRAME itself: the embedded site
 *    opts into `publishPointer`, streaming `cms/pointer` as a normalized 0..1
 *    point in the iframe's DESIGN space. `HostShell` forwards it verbatim as
 *    `OverlayChromeParts.pointer`, and we publish it DIRECTLY as the local
 *    `Cursor` sample (see `useIframePointerCapture`). Because the value is
 *    already normalized in design space (transform-neutral), it needs no host-
 *    rect math and is inherently scale/scroll independent — and it covers the
 *    WHOLE page (nav, hero, footer, empty gaps), since the iframe captures its
 *    own pointer over its entire body, not just the editing-overlay boxes.
 *  - `<RemoteCursors>` projects each remote normalized point back to
 *    `point * stageBox` — the only screen-space math — landing cursors over the
 *    canvas exactly where each peer pointed, regardless of anyone's scale.
 *
 * SCROLL — no scroll correction is needed on either side. The captured value is
 * a design-space normalized point from the iframe (independent of the admin's
 * canvas scroll/scale entirely), and remote cursors are absolutely positioned
 * INSIDE this layer, which scrolls WITH the canvas, so `point × box.size` tracks
 * the content through scroll (`box.size` kept fresh by colab-ui's ResizeObserver).
 *
 * EDIT LOCKS — the shell hands us `targets` whose `geometry` (and each child
 * item's `geometry`) is ALREADY projected into canvas pixels. Locks are keyed per
 * CONTENT ITEM (`${targetId}::${contentId}`), so we read the reconciled lock owner
 * for each child item from the `colab` `EditLock` interaction (`lockedBy`
 * selector) and render a "{name} is editing" badge + highlight anchored to that
 * ITEM's already-mapped box — showing exactly which item a peer is editing, not
 * the whole target area.
 */

import { useEffect, type ReactElement } from "react";
import type { HostPointer } from "@stardust-cms/iframe-adapter/host";
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
  /**
   * The local user's latest pointer over the embedded iframe, forwarded from
   * `OverlayChromeParts.pointer` (which HostShell forwards from
   * `useStardustHost().pointer`). NORMALIZED 0..1 in the iframe's design space,
   * transform-neutral — fed DIRECTLY to the `Cursor` interaction. `null` when the
   * pointer has left the iframe (no cursor).
   */
  pointer: HostPointer;
}

export function PresenceOverlays({
  targets,
  selfId,
  pointer,
}: PresenceOverlaysProps): ReactElement {
  // `<ColabStage>` force-sets `position: relative` on its own element (dropping
  // any `absolute`/`inset` we pass), so it can't itself be the fill layer. Wrap
  // it in an absolutely-positioned, `pointer-events: none` layer over the canvas
  // and let the stage fill that wrapper — the stage box then measures the full
  // canvas, which the normalized cursor math + `<RemoteCursors>` depend on.
  return (
    <div
      className="presence-layer"
      data-presence-layer
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ColabStage style={{ width: "100%", height: "100%" }}>
        <StageContents targets={targets} selfId={selfId} pointer={pointer} />
      </ColabStage>
    </div>
  );
}

interface StageContentsProps {
  targets: MappedTarget[];
  selfId: string;
  pointer: HostPointer;
}

/**
 * The presence content rendered INSIDE `<ColabStage>`, so `useInteraction` /
 * `<RemoteCursors>` (which read the stage context via `useColabStage`) resolve.
 */
function StageContents({
  targets,
  selfId,
  pointer,
}: StageContentsProps): ReactElement {
  // Publish the iframe-sourced pointer as the local normalized cursor sample.
  useIframePointerCapture(pointer);

  return (
    <>
      <RemoteCursors />
      <EditLockLayer targets={targets} selfId={selfId} />
    </>
  );
}

/**
 * A point far off the stage. When the local pointer LEAVES the iframe
 * (`pointer === null`), we publish this sentinel so `<RemoteCursors>` renders the
 * peer's cursor well outside the visible canvas box — the effective "no cursor"
 * for peers. The `colab` `Cursor` interaction is send-only (its wire protocol
 * carries a `{x,y}` point with no clear/remove message, and its reducer keeps the
 * last point per participant until they leave the room), so a stale cursor would
 * otherwise freeze in place on leave. Projecting `point × box` puts this far
 * negative, off-screen, which is the intended "pointer gone" appearance.
 */
const CURSOR_GONE = { x: -1, y: -1 } as const;

/**
 * Publish the IFRAME-SOURCED pointer as the local `colab` `Cursor` sample.
 *
 * SOURCE: `OverlayChromeParts.pointer` — the pointer the embedded site captures
 * over its OWN document (via `publishPointer` / `cms/pointer`) and the host
 * forwards NORMALIZED 0..1 in the iframe's DESIGN space. This replaces the old
 * document-level `pointermove` capture, which only saw the pointer over the
 * editing-overlay content boxes — pointer events over the cross-origin iframe body
 * (hero, nav, footer, gaps) go to the IFRAME's document, never the admin's, so the
 * host never saw them. The iframe now captures its own pointer over the WHOLE
 * page, so the colab cursor tracks everywhere.
 *
 * COORDINATES: the value is already normalized 0..1 in the iframe design space
 * (transform-neutral), exactly what the `Cursor` interaction expects, and exactly
 * what `<RemoteCursors>` re-projects onto its stage box. So we feed it DIRECTLY —
 * no stage multiply, no host-rect math. Being design-space normalized, it is
 * inherently scale- and scroll-independent (the whole point of the fix).
 *
 * LEAVE: when `pointer` is `null` the pointer left the iframe; we publish
 * {@link CURSOR_GONE} so the peer's cursor moves off-screen (see its doc).
 */
function useIframePointerCapture(pointer: HostPointer): void {
  const { send } = useInteraction(Cursor);

  useEffect(() => {
    send(pointer ?? CURSOR_GONE);
  }, [pointer, send]);
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
