/**
 * Unit tests for the demo-owned edit-lock scope addressing.
 *
 * The edit-lock LIFECYCLE (cooperative acquire, non-stealing, idle release,
 * reload/leave safety-clear, remote-holder resolution) now lives in colab-ui's
 * packaged `useEditLock` and is covered by that package's own tests — the demo's
 * former `usePublishEditLock.test.tsx` for that plumbing is gone (SVER-T-0035).
 * What the demo still owns, and what this file covers, is the addressing policy:
 * a lock scope IS the (targetId, contentId) pair, composed via colab-protocol's
 * `composeScopeId`, and only when BOTH ids are present.
 */

import { describe, expect, it } from "vitest";
import { composeScopeId } from "colab-protocol";
import { contentScopeId } from "./usePresenceSession.js";

describe("contentScopeId", () => {
  it("composes a scope from the target + content ids when both are present", () => {
    expect(contentScopeId("t1", "c1")).toBe(composeScopeId("t1", "c1"));
  });

  it("takes NO lock (null) when either id is missing", () => {
    expect(contentScopeId(null, "c1")).toBeNull();
    expect(contentScopeId("t1", null)).toBeNull();
    expect(contentScopeId(null, null)).toBeNull();
  });

  it("keys different content items in the same target to different scopes", () => {
    expect(contentScopeId("t1", "c1")).not.toBe(contentScopeId("t1", "c2"));
  });
});
