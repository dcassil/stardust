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

/**
 * Build a fresh, per-mount local participant {@link Identity}. Called once inside
 * a `useMemo` in `App`, so the randomness runs per tab/mount (never at module
 * scope) — two tabs get distinct ids/names/colors.
 */
export function makeLocalIdentity(): Identity {
  const n = Math.floor(Math.random() * NAMES.length);
  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    id: `local-${suffix}`,
    name: NAMES[n] ?? "Editor",
    color: COLORS[n] ?? "#666",
  };
}
