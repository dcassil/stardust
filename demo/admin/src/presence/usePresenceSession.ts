/**
 * `usePublishEditLock` — publish the local advisory edit-lock as the selection
 * changes, over the generic `colab` `EditLock` interaction.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no document merge. This is the
 * `colab`-backed successor to the old `usePublishEditContext`: instead of a
 * `MockPresenceProvider.publishEditContext(...)` call it drives the `colab`
 * `EditLock` interaction's `send({ scopeId, action })`. The scope id is the
 * selected `data-cms` target id (the same neutral addressing the overlay lock
 * layer reads back via the `lockedBy` selector).
 *
 * The session lifecycle (connect / join / roster / transport) is OWNED by
 * `<ColabProvider>` in `App`; this hook is a thin selection → `send` binding and
 * MUST be called from inside that provider tree. NOT throttled — edit-lock
 * changes must be prompt.
 */

import { useEffect } from "react";
import { useInteraction, type Session } from "colab-ui/react";
import {
  EditLock,
  type EditLockEvent,
  type EditLockSelectors,
  type EditLockState,
} from "colab-ui";
import { asScopeId } from "colab-protocol";

export interface PresenceSelection {
  targetId: string | null;
  contentId: string | null;
}

/**
 * Publish (or clear) the local edit-lock whenever the selected target changes.
 * Clears on deselect and on unmount. Called from inside `<ColabProvider>`.
 */
export function usePublishEditLock(selection: PresenceSelection): void {
  const { send } = useInteraction<EditLockState, EditLockSelectors>(EditLock);

  const { targetId } = selection;

  useEffect(() => {
    if (targetId) {
      const lock: EditLockEvent = {
        scopeId: asScopeId(targetId),
        action: "lock",
      };
      send(lock);
      return () => {
        const clear: EditLockEvent = {
          scopeId: asScopeId(targetId),
          action: "clear",
        };
        send(clear);
      };
    }
    return undefined;
  }, [send, targetId]);
}

/** Re-export so `App` can pass the session type through without a second import. */
export type { Session };
