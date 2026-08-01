/**
 * Seeds the {@link StardustAdapterProvider}'s content map on first mount so the
 * demo site renders meaningfully with no host connected (SIFR-T-0007 AC).
 *
 * The provider's content starts empty and is normally populated by the host's
 * `cms/sendElements` messages. To render standalone, we push the shared
 * {@link seedPayloads} through the same `applyContent` reducer the host path
 * uses — so seed content and injected content flow through one code path.
 *
 * When a host later connects and re-injects content, its payloads replace the
 * seed items at the same `(targetId, index)` slots via the provider's merge, so
 * there is no divergence.
 */

import { useContext, useEffect, useRef, type ReactNode } from "react";
import { StardustContentContext } from "@stardust-cms/iframe-adapter";
import { seedPayloads } from "@demo/shared/content-model";

export function SeedContent({ children }: { children: ReactNode }): ReactNode {
  const ctx = useContext(StardustContentContext);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!ctx || seededRef.current) return;
    seededRef.current = true;
    for (const payload of seedPayloads()) {
      ctx.applyContent(payload);
    }
  }, [ctx]);

  return <>{children}</>;
}
