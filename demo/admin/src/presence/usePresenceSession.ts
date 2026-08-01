/**
 * `usePresenceSession` — owns the admin tab's {@link MockPresenceProvider}.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no document merge, and NO server:
 * the default {@link MockPresenceProvider} fans out over `BroadcastChannel`, so
 * a second tab on the same origin is all it takes to see cursors + locks.
 *
 * One provider per mount (per tab), connected on mount and disconnected on
 * unmount. The provider is created lazily behind a `useMemo` so the per-tab
 * random identity is minted exactly once — never at module scope.
 *
 * Selection-driven edit-context publishing is NOT done here: the local selection
 * now lives inside the `HostShell` tree (read via `useHostSelection()`), so
 * `App` — which mounts the shell and is therefore OUTSIDE that tree — cannot see
 * it. This hook only constructs + connects the provider; a component rendered
 * inside the shell owns the selection → `publishEditContext` effect (see
 * {@link usePublishEditContext}).
 *
 * The `enabled` flag lets `App` call this hook unconditionally (rules of hooks)
 * while keeping true zero-footprint when off: when `enabled` is false the hook
 * returns `null`, constructs no provider, opens no channel, and publishes
 * nothing. `App` then renders no presence overlays/indicator on that path.
 */

import { useEffect, useMemo } from "react";
import { MockPresenceProvider } from "@stardust-cms/iframe-adapter/presence";
import { PRESENCE_CHANNEL, makeLocalIdentity } from "./config";

export interface PresenceSelection {
  targetId: string | null;
  contentId: string | null;
}

/**
 * Construct + connect a per-mount presence provider. Returns the live provider
 * for the overlays and the sidebar indicator to consume, or `null` when off.
 */
export function usePresenceSession(
  enabled: boolean,
): MockPresenceProvider | null {
  // Constructed at most once, and ONLY when enabled — when off this returns
  // `null`, so no provider, no BroadcastChannel, and no publishing exist.
  const provider = useMemo<MockPresenceProvider | null>(
    () =>
      enabled
        ? new MockPresenceProvider({
            channelName: PRESENCE_CHANNEL,
            self: makeLocalIdentity(),
          })
        : null,
    [enabled],
  );

  useEffect(() => {
    if (!provider) return;
    provider.connect();
    return () => {
      provider.disconnect();
    };
  }, [provider]);

  return provider;
}

/**
 * Publish the local edit-context whenever the selection changes; clear on
 * deselect. Must be called from INSIDE the `HostShell` tree, where the selection
 * (from `useHostSelection()`) is available. NOT throttled (edit-lock changes
 * must be prompt). No-op when `provider` is `null` (presence disabled).
 */
export function usePublishEditContext(
  provider: MockPresenceProvider | null,
  selection: PresenceSelection,
): void {
  useEffect(() => {
    if (!provider) return;
    if (selection.targetId) {
      provider.publishEditContext({
        id: selection.contentId ?? selection.targetId,
        target: selection.targetId,
      });
    } else {
      provider.publishEditContext(null);
    }
  }, [provider, selection.targetId, selection.contentId]);
}
