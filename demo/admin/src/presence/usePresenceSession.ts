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

import { useEffect, useRef } from "react";
import { useInteraction, usePresence, type Session } from "colab-ui/react";
import {
  EditLock,
  type EditLockEvent,
  type EditLockSelectors,
  type EditLockState,
} from "colab-ui";
import { asScopeId, type ScopeId } from "colab-protocol";

export interface PresenceSelection {
  targetId: string | null;
  contentId: string | null;
}

/**
 * The `EditLock` scope for a single CONTENT ITEM. Locks are keyed per content
 * item (not per target area), so two users editing DIFFERENT items in the same
 * area never block each other. The target id is folded in to keep the scope
 * globally unique. Returns `null` unless BOTH ids are present (an area with no
 * specific item selected takes no lock).
 */
export function contentScopeId(
  targetId: string | null,
  contentId: string | null,
): ScopeId | null {
  if (!targetId || !contentId) return null;
  return asScopeId(`${targetId}::${contentId}`);
}

/**
 * Publish (or clear) the local edit-lock for the SELECTED CONTENT ITEM. Clears on
 * deselect, when selection moves to another item, and on unmount. Called from
 * inside `<ColabProvider>`.
 *
 * PER-ITEM SCOPE — the lock is keyed to the specific selected content item
 * (`${targetId}::${contentId}`), not the whole target area. A lock is only taken
 * when a concrete `contentId` is selected.
 *
 * COOPERATIVE MUTUAL EXCLUSION — the `colab` `EditLock` reduce is last-write-wins
 * (a second `action:"lock"` STEALS the scope). To make locks behave as first-
 * holder-wins on the client, we DO NOT send a lock for a scope already held by a
 * DIFFERENT participant: we read the current holder via the `lockedBy` selector
 * before acquiring. We also only send `clear` for a lock we actually took, so a
 * blocked selection never emits a stray `clear` that would drop the remote
 * holder's lock. `selfId` identifies our own locks.
 *
 * NOTE: this is cooperative, client-side policy — a malicious/older client could
 * still steal. TRUE server-enforced exclusion would require a `colab-server`/
 * `colab-ui` change (a first-holder-wins reduce instead of last-write-wins).
 */
export function usePublishEditLock(
  selection: PresenceSelection,
  selfId: string,
): void {
  const { send, selectors } = useInteraction<EditLockState, EditLockSelectors>(
    EditLock,
  );

  const scopeId = contentScopeId(selection.targetId, selection.contentId);

  // Hold the latest `lockedBy` selector in a ref so the acquire effect can read
  // the CURRENT holder without depending on `selectors` (which is a fresh object
  // each render). We intentionally sample the holder once, at acquire time, on a
  // scope/self change — a holder change mid-selection is handled by the UI
  // read-only gate (`useContentLock`), not by re-running acquisition.
  const lockedByRef = useRef(selectors.lockedBy);
  lockedByRef.current = selectors.lockedBy;

  useEffect(() => {
    if (scopeId) {
      // Don't steal a lock a different participant already holds.
      const holder = lockedByRef.current(scopeId);
      if (holder !== null && holder !== selfId) {
        return undefined;
      }
      const lock: EditLockEvent = { scopeId, action: "lock" };
      send(lock);
      return () => {
        // Only clear the lock we actually acquired above.
        const clear: EditLockEvent = { scopeId, action: "clear" };
        send(clear);
      };
    }
    return undefined;
  }, [send, scopeId, selfId]);
}

/**
 * `useContentLock` — is the given CONTENT ITEM currently locked by a REMOTE
 * participant?
 *
 * Reads the reconciled lock holder via the `EditLock` `lockedBy` selector for
 * that item's per-item scope (`${targetId}::${contentId}`) and compares it to
 * `selfId`. When a different participant holds the item, returns
 * `lockedByRemote: true` and resolves that holder's display name from the
 * `usePresence()` roster (remote participants only, which is exactly the holder
 * set we care about). Used to gate the panels read-only + render the banner.
 * Editing a DIFFERENT item in the same area is unaffected.
 */
export interface ContentLock {
  lockedByRemote: boolean;
  holderName: string | null;
}

export function useContentLock(
  targetId: string | null,
  contentId: string | null,
  selfId: string,
): ContentLock {
  const { selectors } = useInteraction<EditLockState, EditLockSelectors>(
    EditLock,
  );
  const roster = usePresence();

  const scopeId = contentScopeId(targetId, contentId);
  if (scopeId === null) return { lockedByRemote: false, holderName: null };
  const holder = selectors.lockedBy(scopeId);
  if (holder === null || holder === selfId) {
    return { lockedByRemote: false, holderName: null };
  }
  const participant = roster.find((p) => p.id === holder);
  return { lockedByRemote: true, holderName: participant?.name ?? null };
}

/** Re-export so `App` can pass the session type through without a second import. */
export type { Session };
