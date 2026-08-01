/**
 * Explicit localhost origins for the demo pair (NFR-002 — never `"*"`).
 *
 * The site's frame-link `targetOrigin` must equal the admin's origin (the window
 * that embeds it). Overridable via Vite env for alternate ports, but always an
 * explicit origin string.
 */

/** The admin (host) origin this site expects to be embedded by. */
export const ADMIN_ORIGIN: string =
  (import.meta.env.VITE_ADMIN_ORIGIN as string | undefined) ??
  "http://localhost:5173";

/**
 * Stable frame-link options for the iframe-side `FrameLinkProvider`.
 *
 * MUST be a module-level constant: `FrameLinkProvider` recreates/destroys its
 * frame-link instance whenever the `options` object identity changes, so a fresh
 * literal per render would tear down the connection continuously.
 */
export const FRAME_LINK_OPTIONS = { targetOrigin: ADMIN_ORIGIN } as const;
