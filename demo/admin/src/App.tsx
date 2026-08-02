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
 *  3. supplies `renderOverlayChrome` — the bundled {@link Overlays} plus the
 *     `colab` presence layer ({@link PresenceOverlays}) — reading the
 *     shell-tracked selection from the chrome parts, and
 *  4. arranges the canvas beside a sidebar (palette / side panel / versioning
 *     controls) via `renderLayout`.
 *
 * PRESENCE (colab) — when {@link PRESENCE_ENABLED} the whole shell is wrapped in
 * `colab-ui`'s `<ColabProvider>`, which OWNS the collaboration session: the
 * Socket.IO transport to the demo relay ({@link PRESENCE_SERVER_URL}), the room
 * join, the roster, and the registered `Cursor` + `EditLock` interactions. The
 * presence overlays/indicator and the selection → edit-lock publisher all live
 * inside that provider tree. When the flag is off, no provider mounts and nothing
 * presence-related loads.
 *
 * Selection is read from the dashboard's first-class API: the side panel +
 * presence live inside the shell tree via {@link SidebarPanels}, which calls
 * `useHostSelection()`.
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
import { ColabProvider, Cursor } from "colab-ui/react";
import { EditLock } from "colab-ui";
import { createDemoContentStore } from "@demo/shared/store";
import { DEMO_BLOCK_TYPES } from "./blockTypes";
import { VersionControls } from "./VersionControls";
import { EditPanel } from "./EditPanel";
import { StylePanel } from "./StylePanel";
import { SITE_ORIGIN, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config";
import {
  PRESENCE_ENABLED,
  PRESENCE_SERVER_URL,
  PRESENCE_ROOM,
  makeLocalIdentity,
} from "./presence/config";
import { usePublishEditLock } from "./presence/usePresenceSession";
import { PresenceOverlays } from "./presence/PresenceOverlays";
import { PresenceIndicator } from "./presence/PresenceIndicator";

/** The interactions registered on the `colab` session (cursors + edit-locks). */
const PRESENCE_INTERACTIONS = [Cursor, EditLock];

export function App(): ReactNode {
  // Construct the store exactly once (a fresh instance would reset the seed +
  // version history on every render).
  const store = useMemo(() => createDemoContentStore(), []);

  // Mint the per-tab local identity exactly once (never at module scope), so two
  // tabs get distinct ids/names/colors in the shared room.
  const identity = useMemo(() => makeLocalIdentity(), []);

  const renderOverlayChrome = (parts: OverlayChromeParts): ReactNode => (
    <>
      <Overlays
        targets={parts.targets}
        callbacks={parts.callbacks}
        selectedTargetId={parts.selectedTargetId}
        selectedContentId={parts.selectedContentId}
      />
      {PRESENCE_ENABLED && (
        <PresenceOverlays targets={parts.targets} selfId={identity.id} />
      )}
    </>
  );

  const renderLayout = ({ canvas, status }: HostShellLayoutParts): ReactNode => (
    <div className="admin-layout">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand__mark" aria-hidden="true" />
          <span className="admin-brand__word">Northwind</span>
          <span className="admin-brand__sub">Editor</span>
        </div>
        {/* Shell-owned connection status (dot + label + origin/scale meta).
            Restyled into a clean badge; origin/scale demoted to muted metadata. */}
        {status}
      </header>
      <div className="admin-body">
        <div className="admin-main">{canvas}</div>
        <aside className="admin-sidebar">
          <SidebarPanels selfId={identity.id} />
        </aside>
      </div>
    </div>
  );

  const shell = (
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

  // Gate presence entirely on the flag: when off, no `<ColabProvider>` mounts, no
  // socket connects, and no colab code path runs.
  if (!PRESENCE_ENABLED) return shell;

  // `<ColabProvider>` builds its own default Socket.IO transport from
  // `serverUrl`/`room`/`identity` (colab-ui@0.1.1's `createSocketIoTransport`):
  // it connects with the relay's `{ roomId, identity }` handshake, maps colab
  // envelopes onto the relay's discrete events, and buffers pre-connect sends —
  // so no custom transport bridge is needed anymore.
  return (
    <ColabProvider
      serverUrl={PRESENCE_SERVER_URL}
      room={PRESENCE_ROOM}
      identity={identity}
      interactions={PRESENCE_INTERACTIONS}
    >
      {shell}
    </ColabProvider>
  );
}

/**
 * The sidebar's selection-aware contents. Rendered INSIDE the `HostShell` tree
 * (from `renderLayout`), so it can read the shell-tracked selection via the
 * dashboard's `useHostSelection()` hook. That selection feeds the field editor,
 * the style panel, and — when presence is on — the `colab` edit-lock publisher.
 */
interface SidebarPanelsProps {
  selfId: string;
}

function SidebarPanels({ selfId }: SidebarPanelsProps): ReactNode {
  const { selectedTargetId, selectedContentId } = useHostSelection();

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
      {PRESENCE_ENABLED && (
        <PresenceSidebar
          selfId={selfId}
          selectedTargetId={selectedTargetId}
          selectedContentId={selectedContentId}
        />
      )}
      <VersionControls />
    </>
  );
}

interface PresenceSidebarProps {
  selectedTargetId: string | null;
  selectedContentId: string | null;
  selfId: string;
}

/**
 * The presence-only sidebar slice, mounted inside `<ColabProvider>` (via the
 * shell tree) so its `colab` hooks resolve. It publishes the selection as an
 * advisory edit-lock and shows the participant indicator.
 */
function PresenceSidebar({
  selectedTargetId,
  selectedContentId,
  selfId,
}: PresenceSidebarProps): ReactNode {
  usePublishEditLock({
    targetId: selectedTargetId,
    contentId: selectedContentId,
  });

  return <PresenceIndicator selfId={selfId} />;
}
