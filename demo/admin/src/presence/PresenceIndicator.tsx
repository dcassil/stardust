/**
 * `PresenceIndicator` — small sidebar badge shown only when presence is enabled.
 *
 * Reflects how many OTHER participants are currently present (via colab-ui's
 * packaged `usePresenceCount`, which counts the roster excluding `selfId`) and
 * reminds the user to open a second tab to see cursors + locks. Rendered ONLY on
 * the flag-on path, from inside `<ColabProvider>`.
 */

import type { ReactNode } from "react";
import { usePresenceCount } from "colab-ui/react";

export interface PresenceIndicatorProps {
  /** The local participant id, excluded from the "others" count. */
  selfId: string;
}

export function PresenceIndicator({ selfId }: PresenceIndicatorProps): ReactNode {
  // colab-server's ROSTER includes the local participant; `usePresenceCount`
  // excludes `selfId`, so this is the remote-only "others here" count.
  const others = usePresenceCount(selfId);

  return (
    <section className="panel" data-testid="presence-indicator">
      <div className="panel__head">
        <h2 className="panel__title">Presence</h2>
        <span className="presence-badge">
          <span className="presence-badge__dot" aria-hidden="true" />
          Live
        </span>
      </div>
      <div className="presence-status">
        <span className="presence-status__count" data-testid="presence-others">
          {others}
        </span>
        <span className="presence-status__text">
          {others === 0
            ? "No one else editing right now"
            : `${others} other${others === 1 ? "" : "s"} editing with you`}
        </span>
      </div>
      <p className="panel__hint">
        Open a second tab to see live cursors and edit locks.
      </p>
    </section>
  );
}
