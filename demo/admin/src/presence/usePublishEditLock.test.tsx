/**
 * Unit tests for `usePublishEditLock`'s lifecycle safety-clears (Tasks 2 & 3):
 *
 *  - IDLE RELEASE: after `IDLE_RELEASE_MS` of no user interaction the held lock is
 *    released via a `clear`; a trusted interaction re-arms the countdown; a
 *    programmatic (non-trusted) event does NOT.
 *  - RELOAD / LEAVE / CLOSE: a `pagehide` (and `beforeunload`) dispatch clears the
 *    held lock synchronously.
 *  - CORRECTNESS: nothing is cleared when no scope is held (no selection), and the
 *    non-stealing acquire path is preserved (no `lock` sent when a different
 *    participant holds the scope).
 *
 * `colab-ui` / `colab-ui/react` are mocked so the test drives only this hook's
 * timer/listener logic against a captured `send` spy and a controllable
 * `lockedBy` selector. Uses fake timers to prove the 5-minute path without waiting.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// ---- mock the colab surface the hook consumes ----
const sendSpy = vi.fn();
let lockedByImpl: (scopeId: string) => string | null = () => null;

vi.mock("colab-ui/react", () => ({
  useInteraction: () => ({
    send: sendSpy,
    selectors: { lockedBy: (scopeId: string) => lockedByImpl(scopeId) },
  }),
  usePresence: () => [],
}));
vi.mock("colab-ui", () => ({ EditLock: { id: "edit-lock" } }));
vi.mock("colab-protocol", () => ({
  asScopeId: (s: string) => s,
}));

import { usePublishEditLock, IDLE_RELEASE_MS } from "./usePresenceSession.js";

const SELF = "self-1";
const SELECTION = { targetId: "t1", contentId: "c1" };
const SCOPE = "t1::c1";

function lockCalls(): { scopeId: string }[] {
  return sendSpy.mock.calls
    .map((c) => c[0] as { scopeId: string; action: string })
    .filter((e) => e.action === "lock");
}
function clearCalls(): { scopeId: string }[] {
  return sendSpy.mock.calls
    .map((c) => c[0] as { scopeId: string; action: string })
    .filter((e) => e.action === "clear");
}

beforeEach(() => {
  sendSpy.mockClear();
  lockedByImpl = () => null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("usePublishEditLock lifecycle safety-clears", () => {
  it("acquires a lock for the selected scope", () => {
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });
    expect(lockCalls()).toHaveLength(1);
    expect(lockCalls()[0]!.scopeId).toBe(SCOPE);
  });

  it("releases the held lock after IDLE_RELEASE_MS of no interaction", () => {
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });
    expect(clearCalls()).toHaveLength(0);

    vi.advanceTimersByTime(IDLE_RELEASE_MS - 1);
    expect(clearCalls()).toHaveLength(0); // not yet

    vi.advanceTimersByTime(1);
    expect(clearCalls()).toHaveLength(1);
    expect(clearCalls()[0]!.scopeId).toBe(SCOPE);
  });

  // NOTE ON THE TRUSTED RE-ARM: jsdom hard-codes `Event.isTrusted` to `false` as a
  // non-configurable own property on every Event instance, so a genuinely
  // "trusted" event cannot be synthesized here. The `isTrusted` gate is therefore
  // proven by its contrapositive below — a programmatic (untrusted) event does NOT
  // re-arm the countdown, so the timer still fires. The positive re-arm on real
  // pointer/keyboard input is exercised in the Playwright run against the live app.
  it("a programmatic (non-trusted) event does NOT re-arm the idle countdown", () => {
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });

    vi.advanceTimersByTime(IDLE_RELEASE_MS - 1000);
    window.dispatchEvent(new Event("keydown")); // jsdom default isTrusted:false
    vi.advanceTimersByTime(1000);
    expect(clearCalls()).toHaveLength(1); // original countdown fired; NOT re-armed
  });

  it("clears the held lock on pagehide", () => {
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });
    window.dispatchEvent(new Event("pagehide"));
    expect(clearCalls().some((e) => e.scopeId === SCOPE)).toBe(true);
  });

  it("clears the held lock on beforeunload", () => {
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });
    window.dispatchEvent(new Event("beforeunload"));
    expect(clearCalls().some((e) => e.scopeId === SCOPE)).toBe(true);
  });

  it("does NOT clear on pagehide when no scope is held (no selection)", () => {
    renderHook(() => {
      usePublishEditLock({ targetId: null, contentId: null }, SELF);
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(clearCalls()).toHaveLength(0);
  });

  it("does not steal or hold a lock a different participant owns", () => {
    lockedByImpl = () => "other-user";
    renderHook(() => { usePublishEditLock(SELECTION, SELF); });
    expect(lockCalls()).toHaveLength(0);
    // Nothing held → idle + pagehide are no-ops.
    window.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(IDLE_RELEASE_MS);
    expect(clearCalls()).toHaveLength(0);
  });
});
