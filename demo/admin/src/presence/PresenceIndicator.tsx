/**
 * `PresenceIndicator` — small sidebar badge shown only when presence is enabled.
 *
 * Reflects how many OTHER participants are currently present (via the `colab`
 * `usePresence` hook, which returns the REMOTE roster — self excluded) and
 * reminds the user to open a second tab to see cursors + locks. Rendered ONLY on
 * the flag-on path, from inside `<ColabProvider>`.
 */

import type { ReactNode } from "react";
import { usePresence } from "colab-ui/react";

export interface PresenceIndicatorProps {
  /** The local participant id, excluded from the "others" count. */
  selfId: string;
}

export function PresenceIndicator({ selfId }: PresenceIndicatorProps): ReactNode {
  const participants = usePresence();
  // colab-server's ROSTER includes the local participant, so exclude self here
  // (the "others here" count is remote-only).
  const others = participants.filter((p) => p.id !== selfId).length;

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
