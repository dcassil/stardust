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
 *    canvas), so its measured box IS the canvas box.
 *  - `useCursorCapture()` samples the local pointer as a normalized point and
 *    publishes it through the `Cursor` interaction.
 *  - `<RemoteCursors>` projects each remote normalized point back to
 *    `point * stageBox` — the only screen-space math — landing cursors over the
 *    canvas exactly where each peer pointed, regardless of anyone's scale.
 *
 * EDIT LOCKS — the shell hands us `targets` whose `geometry` is ALREADY projected
 * into canvas pixels. We read the reconciled lock owner per target from the
 * `colab` `EditLock` interaction (`lockedBy` selector, keyed by the target id as
 * a `ScopeId`) and render a "{name} is editing" badge anchored to that target's
 * already-mapped box, so lock boxes line up with the target overlays.
 */

import { useEffect, type ReactElement } from "react";
import {
  ColabStage,
  Cursor,
  RemoteCursors,
  usePresence,
  useInteraction,
  useColabStage,
} from "colab-ui/react";
import {
  EditLock,
  type EditLockSelectors,
  type EditLockState,
} from "colab-ui";
import { asScopeId, type Participant } from "colab-protocol";
import type { MappedTarget } from "@stardust-cms/iframe-adapter/host";

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
  return (
    <div
      className="presence-layer"
      data-presence-layer
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ColabStage style={{ width: "100%", height: "100%" }}>
        <StageContents targets={targets} selfId={selfId} />
      </ColabStage>
    </div>
  );
}

interface StageContentsProps {
  targets: MappedTarget[];
  selfId: string;
}

/**
 * The presence content rendered INSIDE `<ColabStage>`, so `useCursorCapture` /
 * `<RemoteCursors>` (which read the stage context via `useColabStage`) resolve.
 */
function StageContents({ targets, selfId }: StageContentsProps): ReactElement {
  // Publish the local pointer as a normalized cursor sample.
  useDocumentCursorCapture();

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
 * beneath it. A document-level listener normalized against the measured stage box
 * reproduces the same normalized sample stream without capturing pointer events —
 * the neutral, transform-agnostic point the `Cursor` interaction expects.
 */
function useDocumentCursorCapture(): void {
  const { box } = useColabStage();
  const { send } = useInteraction(Cursor);

  useEffect(() => {
    if (!box) return undefined;
    const onMove = (event: PointerEvent): void => {
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return;
      send({ x, y });
    };
    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
    };
  }, [box, send]);
}

interface EditLockLayerProps {
  targets: MappedTarget[];
  selfId: string;
}

/**
 * Render one advisory "{name} is editing" badge per target that a REMOTE
 * participant holds a lock on, anchored to that target's already-mapped canvas
 * box. A target with no remote lock owner (or a self-held lock) shows nothing.
 */
function EditLockLayer({ targets, selfId }: EditLockLayerProps): ReactElement {
  const { selectors } = useInteraction<EditLockState, EditLockSelectors>(
    EditLock,
  );
  const roster = usePresence();

  return (
    <>
      {targets.map((target) => {
        const owner = selectors.lockedBy(asScopeId(target.targetId));
        // Skip unlocked targets and locks the LOCAL participant holds (you don't
        // badge your own edit). colab-server's ROSTER includes self, so the
        // self check is explicit rather than an "absent from roster" inference.
        if (!owner || owner === selfId) return null;
        const participant = roster.find((p: Participant) => p.id === owner);
        if (!participant) return null;
        const box = target.geometry;
        return (
          <div
            key={target.targetId}
            className="presence-lock"
            data-presence-lock={target.targetId}
            style={{
              position: "absolute",
              top: box.top,
              left: box.left,
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
          </div>
        );
      })}
    </>
  );
}
