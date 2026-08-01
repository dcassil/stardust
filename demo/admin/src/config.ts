/**
 * Explicit localhost origins for the admin (host) side (NFR-002 — never `"*"`).
 *
 * `SITE_ORIGIN` is the embedded demo site's origin: it is BOTH the iframe `src`
 * origin and the explicit `origin`/`targetOrigin` handed to `useStardustHost`
 * and `FrameLinkProvider`. These must match for the frame-link handshake.
 */

/** The embedded demo-site origin (host → iframe target). */
export const SITE_ORIGIN: string =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ??
  "http://localhost:5174";

/** Full URL loaded into the preview iframe. */
export const SITE_URL = `${SITE_ORIGIN}/`;

/**
 * Stable frame-link options for the host `FrameLinkProvider`.
 *
 * MUST be a module-level constant: `FrameLinkProvider` recreates (and destroys)
 * its frame-link instance whenever the `options` object identity changes, which
 * would tear down the connection on every render if a fresh literal were passed.
 */
export const FRAME_LINK_OPTIONS = { targetOrigin: SITE_ORIGIN } as const;

/**
 * The intrinsic design width (in unscaled px) the iframe document is laid out
 * at. The canvas scales this down to fit; `useStardustHost` derives `scale`
 * from container width / this width, and overlays are mapped by that scale.
 */
export const DESIGN_WIDTH = 1024;

/**
 * The iframe document height (unscaled px). The canvas reserves
 * `DESIGN_HEIGHT * scale` on screen. Generous so the whole demo page is visible;
 * the iframe scrolls internally if content exceeds it, and overlays remap on
 * scroll.
 */
export const DESIGN_HEIGHT = 900;
