/**
 * Demo site root.
 *
 * Wires the iframe-side adapter stack:
 *
 *  1. `FrameLinkProvider` — owns the frame-link transport. Its `targetOrigin` is
 *     the ADMIN's origin (the window that embeds this site), passed explicitly
 *     from build-time config — never `"*"` (NFR-002).
 *  2. `StardustAdapterProvider` — registers the frame-link target once, answers
 *     `cms/requestTargetPositions` with live discovery, folds `cms/sendElements`
 *     into its content map, and streams geometry/scroll to the host.
 *  3. `SeedContent` — seeds that content map so the page renders standalone.
 *  4. `Page` — the `EditableTarget` layout.
 *
 * When opened standalone (top-level window), `window.parent === window`, so the
 * one-time connect attempt targets self and harmlessly times out; the page still
 * renders from its seed content. When embedded by the admin, it connects to the
 * admin and becomes live-editable.
 */

import type { ReactNode } from "react";
import { FrameLinkProvider } from "frame-link-react";
import {
  StardustAdapterProvider,
  StyleFeature,
} from "@stardust-cms/iframe-adapter";
import { SeedContent } from "./SeedContent";
import { Page } from "./Page";
import { FRAME_LINK_OPTIONS } from "./config";

/**
 * The style feature (SIFR-I-0005) is OPT-IN. The demo enables it by default and
 * lets an `?styles=off` query param disable it, so the E2E harness can exercise
 * both the enabled path (live style updates) and the zero-footprint disabled
 * path (no subscription, no adapter `<style>` node) from one build.
 */
function styleFeatureEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return !new URLSearchParams(window.location.search).has("stylesOff");
}

export function App(): ReactNode {
  return (
    <FrameLinkProvider options={FRAME_LINK_OPTIONS}>
      <StardustAdapterProvider>
        {/* Opt-in style feature: subscribes to cms/updateStyles only when
            enabled; renders nothing and leaves zero footprint when disabled. */}
        <StyleFeature enabled={styleFeatureEnabled()} important />
        <SeedContent>
          <Page />
        </SeedContent>
      </StardustAdapterProvider>
    </FrameLinkProvider>
  );
}
