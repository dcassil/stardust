/**
 * `AdminOverlays` — the demo's composable overlay chrome, rendered from
 * `HostShell`'s `renderOverlayChrome` seam.
 *
 * This REPLACES the bundled `<Overlays>` chrome with the 0.2 COMPOSABLE overlay
 * primitives: one `<ContentOverlay>` per mapped target, each providing a
 * per-child {@link ContentOverlay} context that its `SelectionRing` + `Actions`
 * (`EditButton` / `RemoveButton` / `MoveHandle`) read to position and wire
 * themselves. The action primitives route their mutations through the dashboard's
 * `useEditingActions` (`startEditing` / `remove` / `move`) internally — no store
 * plumbing here. Drag/drop + selection still emit through the host `callbacks`
 * (from `OverlayChromeParts.callbacks`) handed to each `<ContentOverlay>` and to
 * the per-child `<InsertZone>`s.
 *
 * WHY `renderOverlayChrome` (and not a hook): the composable overlay needs the
 * host-mapped `targets` geometry and the local `pointer`, and in 0.2.0 those are
 * exposed to a host ONLY through `OverlayChromeParts` (the `useCanvas` engine that
 * carries them is not part of the package's public entry). So this is the public,
 * non-deep-import source of geometry for BOTH the editing chrome and presence.
 *
 * PRESENCE — when enabled, {@link PresenceOverlays} renders alongside, fed the
 * same `targets` (edit-lock badges) and the forwarded local `pointer` (the
 * collaboration cursor). Presence viewing is available even in read-only.
 */

import { type ReactNode } from "react";
import type {
  MappedTarget,
  OperationCallbacks,
  HostPointer,
} from "@stardust-cms/iframe-adapter/host";
import {
  ContentOverlay,
  ContentOverlayActions,
  SelectionRing,
  EditButton,
  RemoveButton,
  MoveHandle,
  InsertZone,
} from "@stardust-cms/dashboard";
import { PRESENCE_ENABLED } from "./presence/config";
import { PresenceOverlays } from "./presence/PresenceOverlays";

export interface AdminOverlaysProps {
  /** Host-mapped targets (`OverlayChromeParts.targets`). */
  targets: MappedTarget[];
  /** Host edit-intent callbacks (`OverlayChromeParts.callbacks`). */
  callbacks: OperationCallbacks;
  /** Whether editing chrome is interactive (`OverlayChromeParts.editable`). */
  editable: boolean;
  /** The local user's pointer over the iframe (`OverlayChromeParts.pointer`). */
  pointer: HostPointer;
  /** The local participant id, so self-held locks are not badged. */
  selfId: string;
}

export function AdminOverlays({
  targets,
  callbacks,
  editable,
  pointer,
  selfId,
}: AdminOverlaysProps): ReactNode {
  return (
    <>
      {targets.map((target) => (
        <ContentOverlay
          key={target.targetId}
          target={target}
          callbacks={callbacks}
        >
          <SelectionRing />
          <ContentOverlayActions>
            <EditButton editable={editable} />
            <MoveHandle editable={editable} />
            <RemoveButton editable={editable} />
          </ContentOverlayActions>
        </ContentOverlay>
      ))}
      {targets.map((target) => (
        <InsertZone
          key={`insert-${target.targetId}`}
          target={target}
          index={target.children.length}
          editable={editable}
        />
      ))}
      {PRESENCE_ENABLED && (
        <PresenceOverlays targets={targets} selfId={selfId} pointer={pointer} />
      )}
    </>
  );
}
