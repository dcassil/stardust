/**
 * `PresenceOverlays` — the presence overlay layer, rendered by the shell's
 * `renderOverlayChrome` alongside the editing `<Overlays>`.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no merge. Mounted ONLY when the
 * presence flag is enabled; the disabled path never renders it and never pulls
 * the `./presence` runtime.
 *
 * Coordinate model: the shell hands us `targets` whose `geometry` is ALREADY
 * projected into host/canvas pixels by the SIFR-I-0003 `mapGeometry` (top/left/
 * width/height, scaled). We therefore:
 *  - publish the local pointer in that SAME canvas space (relative to this
 *    layer's top-left), and
 *  - render `RemoteCursors` / `EditLockIndicators` with an IDENTITY transform,
 *    building each `LockTarget.geometry` from the already-mapped box.
 * That way every tab's cursors + lock boxes line up with the target overlays
 * regardless of who is scaled how, reusing the shell's geometry rather than
 * re-deriving scale math.
 */

import { useEffect, useMemo, useRef, type ReactElement } from "react";
import {
  RemoteCursors,
  EditLockIndicators,
  type LockTarget,
} from "@stardust-cms/iframe-adapter/presence";
import type { MappedTarget } from "@stardust-cms/iframe-adapter/host";
import type { GeometryTransform } from "@stardust-cms/iframe-adapter/host";
import type { MockPresenceProvider } from "@stardust-cms/iframe-adapter/presence";

/** Identity transform: coordinates are already in canvas space. */
const IDENTITY: GeometryTransform = { scale: 1, scrollOffset: { x: 0, y: 0 } };

/** Build a full `Geometry`-shaped lock target from an already-mapped box. */
function lockTargetFrom(
  targetId: string,
  box: { top: number; left: number; width: number; height: number },
): LockTarget {
  return {
    targetId,
    geometry: {
      top: box.top,
      left: box.left,
      right: box.left + box.width,
      bottom: box.top + box.height,
      width: box.width,
      height: box.height,
      x: box.left,
      y: box.top,
    },
  };
}

export interface PresenceOverlaysProps {
  provider: MockPresenceProvider;
  targets: MappedTarget[];
}

export function PresenceOverlays({
  provider,
  targets,
}: PresenceOverlaysProps): ReactElement {
  const layerRef = useRef<HTMLDivElement>(null);

  // Publish local pointer moves in canvas space. A document-level listener lets
  // this layer stay `pointer-events: none` so it never steals clicks from the
  // editing overlays below it. Coordinates are translated relative to the
  // layer's top-left — the same canvas space `mapGeometry` produces.
  useEffect(() => {
    const onMove = (event: PointerEvent): void => {
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      provider.publishPointer({ x, y });
    };
    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
    };
  }, [provider]);

  const lockTargets = useMemo<LockTarget[]>(
    () => targets.map((t) => lockTargetFrom(t.targetId, t.geometry)),
    [targets],
  );

  return (
    <div
      ref={layerRef}
      className="presence-layer"
      data-presence-layer
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <RemoteCursors provider={provider} transform={IDENTITY} />
      <EditLockIndicators
        provider={provider}
        transform={IDENTITY}
        targets={lockTargets}
      />
    </div>
  );
}
