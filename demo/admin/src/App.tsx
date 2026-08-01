/**
 * Demo admin (host) root — rebuilt on `@stardust-cms/dashboard`'s `HostShell`.
 *
 * The hand-rolled host stack (FrameLinkProvider + HostCanvas + Editing +
 * StoreBridge + Overlays + useContentStore + useSendElements + Palette +
 * SidePanel) is gone. `HostShell` now OWNS the transport, the store injection,
 * the geometry canvas, and the ops → store → `cms/sendElements` pipeline. This
 * file just:
 *
 *  1. constructs the VCE-backed {@link VceContentStoreAdapter} once (seeded from
 *     the shared demo content model),
 *  2. hands it to `HostShell` together with the demo's `text`/`image`
 *     {@link DEMO_BLOCK_TYPES} registry and the explicit iframe origin (never `*`),
 *  3. supplies `renderOverlayChrome` — the bundled {@link Overlays} plus presence
 *     cursors — reading the shell-tracked selection from the chrome parts, and
 *  4. arranges the canvas beside a sidebar (palette / side panel / versioning
 *     controls) via `renderLayout`.
 *
 * Selection is read from the dashboard's first-class API (dashboard 0.1.2): the
 * side panel + presence live inside the shell tree via {@link SidebarPanels},
 * which calls `useHostSelection()`. There is no render-phase `setState` mirroring
 * selection into `App` local state anymore (that triggered React's "Cannot update
 * a component while rendering a different component" warning and desynced the
 * sidebar).
 *
 * The palette / side panel live in the sidebar (rendered by `renderLayout`), NOT
 * as overlay-layer `children`, so they are not double-rendered over the canvas —
 * `children` is intentionally omitted.
 */

import { useMemo, type ReactNode } from "react";
import {
  HostShell,
  Overlays,
  Palette,
  useHostSelection,
  type OverlayChromeParts,
  type HostShellLayoutParts,
} from "@stardust-cms/dashboard";
import { createDemoContentStore } from "@demo/shared/store";
import { DEMO_BLOCK_TYPES } from "./blockTypes";
import { VersionControls } from "./VersionControls";
import { EditPanel } from "./EditPanel";
import { StylePanel } from "./StylePanel";
import { SITE_ORIGIN, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config";
import { PRESENCE_ENABLED } from "./presence/config";
import {
  usePresenceSession,
  usePublishEditContext,
} from "./presence/usePresenceSession";
import { PresenceOverlays } from "./presence/PresenceOverlays";
import { PresenceIndicator } from "./presence/PresenceIndicator";
import type { MockPresenceProvider } from "@stardust-cms/iframe-adapter/presence";

export function App(): ReactNode {
  // Construct the store exactly once (a fresh instance would reset the seed +
  // version history on every render).
  const store = useMemo(() => createDemoContentStore(), []);

  // Server-less presence session (BroadcastChannel), gated by the build flag.
  // When the flag is off `provider` is null and nothing presence-related mounts.
  // Selection-based edit-context publishing happens inside the shell tree (see
  // SidebarPanels), where `useHostSelection()` is available.
  const presenceProvider = usePresenceSession(PRESENCE_ENABLED);

  const renderOverlayChrome = (parts: OverlayChromeParts): ReactNode => (
    <>
      <Overlays
        targets={parts.targets}
        callbacks={parts.callbacks}
        selectedTargetId={parts.selectedTargetId}
        selectedContentId={parts.selectedContentId}
      />
      {presenceProvider && (
        <PresenceOverlays provider={presenceProvider} targets={parts.targets} />
      )}
    </>
  );

  const renderLayout = ({ canvas, status }: HostShellLayoutParts): ReactNode => (
    <div className="admin-layout">
      <div className="admin-main">
        {status}
        {canvas}
      </div>
      <aside className="admin-sidebar">
        <SidebarPanels presenceProvider={presenceProvider} />
      </aside>
    </div>
  );

  return (
    <div className="admin-root">
      <HostShell
        store={store}
        blockTypes={DEMO_BLOCK_TYPES}
        iframeOrigin={SITE_ORIGIN}
        designWidth={DESIGN_WIDTH}
        designHeight={DESIGN_HEIGHT}
        renderOverlayChrome={renderOverlayChrome}
        renderLayout={renderLayout}
      />
    </div>
  );
}

interface SidebarPanelsProps {
  presenceProvider: MockPresenceProvider | null;
}

/**
 * The sidebar's selection-aware contents. Rendered INSIDE the `HostShell` tree
 * (from `renderLayout`), so it can read the shell-tracked selection via the
 * dashboard's `useHostSelection()` hook — the clean, warning-free replacement
 * for the old render-phase `setState` mirror. That selection feeds the field
 * editor, the style panel, and the presence edit-context publisher.
 */
function SidebarPanels({ presenceProvider }: SidebarPanelsProps): ReactNode {
  const { selectedTargetId, selectedContentId } = useHostSelection();

  usePublishEditContext(presenceProvider, {
    targetId: selectedTargetId,
    contentId: selectedContentId,
  });

  return (
    <>
      <Palette blockTypes={DEMO_BLOCK_TYPES} />
      <EditPanel
        blockTypes={DEMO_BLOCK_TYPES}
        selectedTargetId={selectedTargetId}
        selectedContentId={selectedContentId}
      />
      <StylePanel
        selectedTargetId={selectedTargetId}
        selectedContentId={selectedContentId}
      />
      {presenceProvider && <PresenceIndicator provider={presenceProvider} />}
      <VersionControls />
    </>
  );
}
