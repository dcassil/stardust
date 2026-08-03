/**
 * Presence scope addressing for the demo.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no document merge. The edit-lock
 * lifecycle (cooperative acquire, non-stealing, idle release, reload/leave
 * safety-clear, remote-holder resolution) now lives entirely in colab-ui's
 * packaged {@link useEditLock} hook — the demo's hand-rolled `usePublishEditLock`
 * / `useContentLock` / idle-timer / `pagehide` plumbing is gone (SVER-T-0035).
 *
 * All that remains here is the demo-owned addressing decision: what a lock scope
 * IS. Locks are keyed per CONTENT ITEM (not per target area) so two users editing
 * DIFFERENT items in the same area never block each other, and the target id is
 * folded in to keep the scope globally unique. Both the host sidebar and the
 * overlay lock layer build the scope through this one helper so they agree.
 */

import { composeScopeId, type ScopeId } from "colab-protocol";
import type { Session } from "colab-ui/react";

/**
 * The `EditLock` scope for a single CONTENT ITEM (`targetId` + `contentId`),
 * composed via colab-protocol's {@link composeScopeId}. Returns `null` unless
 * BOTH ids are present (an area with no specific item selected takes no lock).
 */
export function contentScopeId(
  targetId: string | null,
  contentId: string | null,
): ScopeId | null {
  if (!targetId || !contentId) return null;
  return composeScopeId(targetId, contentId);
}

/** Re-export so `App` can pass the session type through without a second import. */
export type { Session };
