/**
 * Presence feature flag + local participant identity for the admin demo.
 *
 * PRESENCE / EDIT-LOCKS ONLY — no CRDT/OT, no collaborative editing, and NO
 * server. The flag is OFF by default: when `PRESENCE_ENABLED` is false, no
 * provider is constructed, no overlays mount, and the `./presence` subpath's
 * runtime is never pulled — the plain demo is byte-for-byte unchanged.
 *
 * The default {@link MockPresenceProvider} fans presence out over a
 * `BroadcastChannel`, so a second tab on the SAME origin sees this tab's cursor
 * and edit-lock with no socket server anywhere.
 */

/**
 * Read the presence flag from Vite env; default false. Accepts `"1"` or
 * `"true"` (case-insensitive) as ON so both `VITE_PRESENCE_ENABLED=1` and
 * `=true` enable it; anything else (including unset) is OFF.
 */
export const PRESENCE_ENABLED: boolean = (() => {
  const raw = import.meta.env.VITE_PRESENCE_ENABLED as string | undefined;
  return raw === "1" || raw?.toLowerCase() === "true";
})();

/** The BroadcastChannel/app room name the mock adapter fans out over. */
export const PRESENCE_CHANNEL = "stardust-demo-presence";

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
 * Build a fresh, per-mount local participant identity. Called once inside a
 * `useMemo` in {@link usePresenceSession}, so the randomness runs per tab/mount
 * (never at module scope) — two tabs get distinct ids/names/colors.
 */
export function makeLocalIdentity(): {
  id: string;
  name: string;
  color: string;
} {
  const n = Math.floor(Math.random() * NAMES.length);
  const suffix = Math.random().toString(36).slice(2, 6);
  return {
    id: `local-${suffix}`,
    name: NAMES[n] ?? "Editor",
    color: COLORS[n] ?? "#666",
  };
}
