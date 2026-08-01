/**
 * `PresenceIndicator` — small sidebar badge shown only when presence is enabled.
 *
 * Reflects how many OTHER tabs are currently present (via
 * `usePresenceParticipants`, which lists remote participants — self excluded)
 * and reminds the user that presence is server-less: open a second tab on the
 * same origin to see cursors + locks. Rendered ONLY on the flag-on path.
 */

import type { ReactNode } from "react";
import {
  usePresenceParticipants,
  type MockPresenceProvider,
} from "@stardust-cms/iframe-adapter/presence";

export interface PresenceIndicatorProps {
  provider: MockPresenceProvider;
}

export function PresenceIndicator({
  provider,
}: PresenceIndicatorProps): ReactNode {
  const participants = usePresenceParticipants(provider);
  const others = participants.length;

  return (
    <section className="panel" data-testid="presence-indicator">
      <h2 className="panel__title">Presence ON</h2>
      <p className="panel__hint">
        Open a 2nd tab to see cursors/locks (no server — BroadcastChannel).
      </p>
      <dl className="panel__meta">
        <dt>others here</dt>
        <dd data-testid="presence-others">{others}</dd>
      </dl>
    </section>
  );
}
