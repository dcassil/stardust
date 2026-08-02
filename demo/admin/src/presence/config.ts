/**
 * Presence feature flag + local participant identity for the admin demo.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no collaborative editing. Migrated
 * to the generic `colab` collaboration packages (`colab-ui` + `colab-protocol`),
 * which use a Socket.IO relay (`colab-server`) instead of the old server-less
 * BroadcastChannel mock. The flag is OFF by default: when `PRESENCE_ENABLED` is
 * false, no `<ColabProvider>` is mounted, no socket connects, and no overlays
 * render — the plain demo is byte-for-byte unchanged.
 *
 * The relay URL is explicit (never `"*"`): both admin tabs connect to the demo's
 * `colab-server` relay (see `presence-server/index.ts`, started via
 * `npm run demo:presence`) and share one room, so a second tab sees this tab's
 * cursor and edit-lock.
 */

import type { Identity } from "colab-protocol";

/**
 * Read the presence flag from Vite env; default false. Accepts `"1"` or
 * `"true"` (case-insensitive) as ON so both `VITE_PRESENCE_ENABLED=1` and
 * `=true` enable it; anything else (including unset) is OFF.
 */
export const PRESENCE_ENABLED: boolean = (() => {
  const raw = import.meta.env.VITE_PRESENCE_ENABLED as string | undefined;
  return raw === "1" || raw?.toLowerCase() === "true";
})();

/**
 * The `colab` relay URL the default Socket.IO transport connects to. Explicit
 * origin (NFR-002 — never `"*"`); overridable via `VITE_PRESENCE_SERVER_URL`.
 * Defaults to the demo's local relay on port 5175.
 */
export const PRESENCE_SERVER_URL: string =
  (import.meta.env.VITE_PRESENCE_SERVER_URL as string | undefined) ??
  "http://localhost:5175";

/** The `colab` room both admin tabs join to share one presence session. */
export const PRESENCE_ROOM = "stardust-demo-presence";

const NAMES = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Linus"];
const COLORS = [
  "#e6194b",
  "#3cb44b",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#008080",
];

/** sessionStorage keys — PER-TAB (not localStorage), so two tabs of the same
 * origin can hold DISTINCT identities/names. Persists across reload of that tab.
 */
const IDENTITY_STORAGE_KEY = "stardust-presence-identity";
const NAME_STORAGE_KEY = "stardust-presence-name";

interface IdentityBase {
  id: string;
  name: string;
  color: string;
}

/**
 * Build the local participant {@link Identity} for THIS tab. The id + color are
 * minted once per tab and PERSISTED in `sessionStorage` (so a reload keeps the
 * same participant, but a second tab is a distinct participant). The display name
 * is the user-chosen name if one is set (see {@link readStoredName}), else a
 * distinct random default — so two tabs never share a name by accident.
 *
 * Called inside a `useMemo` in `App` keyed by the committed name, so a name
 * change re-mints the identity object (same id/color, new name). Pass the
 * committed name explicitly (from React state) so the memo has a real dependency;
 * falls back to the stored name, then a random per-tab default.
 */
export function makeLocalIdentity(preferredName?: string | null): Identity {
  const base = readStoredBase();
  const trimmedPreferred = preferredName?.trim();
  const preferred =
    trimmedPreferred !== undefined && trimmedPreferred !== ""
      ? trimmedPreferred
      : null;
  const name = preferred ?? readStoredName() ?? base.name;
  return { id: base.id, name, color: base.color };
}

/**
 * The stable per-tab identity id/color/default-name, persisted in
 * `sessionStorage`. Minted once per tab and reused across reloads of that tab.
 */
function readStoredBase(): IdentityBase {
  try {
    const raw = sessionStorage.getItem(IDENTITY_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<IdentityBase>;
      if (
        typeof parsed.id === "string" &&
        typeof parsed.name === "string" &&
        typeof parsed.color === "string"
      ) {
        return { id: parsed.id, name: parsed.name, color: parsed.color };
      }
    }
  } catch {
    // Storage unavailable / malformed — fall through to a fresh mint.
  }
  const n = Math.floor(Math.random() * NAMES.length);
  const suffix = Math.random().toString(36).slice(2, 6);
  const base: IdentityBase = {
    id: `local-${suffix}`,
    name: NAMES[n] ?? "Editor",
    color: COLORS[n] ?? "#666",
  };
  try {
    sessionStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(base));
  } catch {
    // Non-fatal: identity just won't survive a reload in this tab.
  }
  return base;
}

/** Read the user-chosen display name for THIS tab, or null if unset. */
export function readStoredName(): string | null {
  try {
    const raw = sessionStorage.getItem(NAME_STORAGE_KEY);
    const trimmed = raw?.trim();
    return trimmed !== undefined && trimmed !== "" ? trimmed : null;
  } catch {
    return null;
  }
}

/** Persist the user-chosen display name for THIS tab (per-tab, survives reload). */
export function writeStoredName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) {
      sessionStorage.setItem(NAME_STORAGE_KEY, trimmed);
    } else {
      sessionStorage.removeItem(NAME_STORAGE_KEY);
    }
  } catch {
    // Non-fatal.
  }
}
