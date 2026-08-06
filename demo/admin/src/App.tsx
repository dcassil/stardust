/**
 * Demo admin (host) root — level-1 adoption of `@stardust-cms/dashboard` 0.2:
 * `AdminProvider` + the turnkey default App Shell (DEMO-T-0003).
 *
 * The demo is now composed on the dashboard's DEFAULT App Shell instead of the
 * deprecated `HostShell` render-props. `HostShell` remains the mount point, but
 * we deliberately DO NOT supply `renderLayout` / `renderOverlayChrome` as custom
 * arrangements — the `renderLayout` slot is gone entirely, so the demo runs on
 * the turnkey `AdminShell` region substrate (topbar · sidebar · main-content +
 * overlay layer · side-panel · modal-host · footer · command-region), and all
 * region behaviors ship intact.
 *
 * `HostShell` IS the provider-wired "AdminProvider + default App Shell": per the
 * installed declarations it mounts `FrameLinkProvider` + `AdminProvider(store)` +
 * `CanvasProvider` and renders `AdminShell`. There is no public `CanvasProvider`
 * export, so a bare `AdminProvider` + `AdminShell` pair cannot reach the scaled-
 * canvas engine — `HostShell` is the ONLY public way to get the default shell
 * wired to the iframe transport. (See the final report for the friction note.)
 *
 * How the demo's pieces land on the default shell:
 *  - SIDEBAR — the editor sidebar (name field + Content/Styles panels + presence
 *    + version controls) is REGISTERED as a `panels` extension by
 *    {@link SidebarRegistrar}; the default `AdminShell` auto-renders it in its
 *    sidebar region. Selection flows through the first-class `useSelection` hook
 *    (no more `useHostSelection`).
 *  - OVERLAYS — {@link AdminOverlays} renders the COMPOSABLE `ContentOverlay`
 *    chrome (per-target `SelectionRing` + `EditButton`/`MoveHandle`/`RemoveButton`
 *    + `InsertZone`) plus the `colab` presence layer. It is mounted through the
 *    `renderOverlayChrome` seam because that is the only public source of the
 *    host-mapped `targets` geometry + local `pointer` that both the composable
 *    overlay and presence require (the `useCanvas` engine is not public).
 *
 * PRESENCE (colab) — when {@link PRESENCE_ENABLED} the whole shell is wrapped in
 * `<ColabProvider>`, which owns the collaboration session (transport, room join,
 * roster, `Cursor` + `EditLock` interactions). The presence overlays/indicator
 * and the selection → edit-lock publisher all live inside that provider tree.
 */

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EditableContext,
  type EditableContextValue,
} from "./editableContext";
import {
  HostShell,
  type OverlayChromeParts,
} from "@stardust-cms/dashboard";
import { ColabProvider, Cursor } from "colab-ui/react";
import { EditLock } from "colab-ui";
import { createDemoContentStore } from "@demo/shared/store";
import { DEMO_BLOCK_TYPES } from "./blockTypes";
import { SITE_ORIGIN, DESIGN_WIDTH, DESIGN_HEIGHT } from "./config";
import {
  PRESENCE_ENABLED,
  PRESENCE_SERVER_URL,
  PRESENCE_ROOM,
  makeLocalIdentity,
  readStoredName,
  writeStoredName,
} from "./presence/config";
import { AdminOverlays } from "./AdminOverlays";
import { SidebarRegistrar } from "./SidebarRegistrar";

/** The interactions registered on the `colab` session (cursors + edit-locks). */
const PRESENCE_INTERACTIONS = [Cursor, EditLock];

export function App(): ReactNode {
  // Construct the store exactly once (a fresh instance would reset the seed +
  // version history on every render).
  const store = useMemo(() => createDemoContentStore(), []);

  // The committed display name for THIS tab. Persisted per-tab in sessionStorage
  // (distinct across tabs, survives reload); defaults to null → identity uses its
  // random per-tab default name. Committed on Enter/blur (see `NameField`).
  const [committedName, setCommittedName] = useState<string | null>(() =>
    readStoredName(),
  );

  const commitName = useCallback((raw: string): void => {
    const trimmed = raw.trim();
    writeStoredName(trimmed);
    setCommittedName(trimmed ? trimmed : null);
  }, []);

  // Mint the per-tab local identity. The id/color are stable per tab (persisted);
  // the name reflects `committedName`, so re-minting on a name change yields the
  // same participant with a new display name. Keying `<ColabProvider>` by the
  // name below makes it re-join cleanly with the new identity.
  const identity = useMemo(
    () => makeLocalIdentity(committedName),
    [committedName],
  );

  // Reactive editable flag. Starts editable (the store seeds on the draft) and is
  // driven thereafter by `VersionControls` via `useEditable().setEditable`.
  const [editable, setEditable] = useState(true);
  const editableCtx = useMemo<EditableContextValue>(
    () => ({ editable, setEditable }),
    [editable],
  );

  const nameFieldName = committedName ?? identity.name;

  const renderOverlayChrome = (parts: OverlayChromeParts): ReactNode => (
    <AdminOverlays
      targets={parts.targets}
      callbacks={parts.callbacks}
      editable={parts.editable}
      pointer={parts.pointer}
      selfId={identity.id}
    />
  );

  const shell = (
    <EditableContext.Provider value={editableCtx}>
      <div className="admin-root">
        <HostShell
          store={store}
          blockTypes={DEMO_BLOCK_TYPES}
          iframeOrigin={SITE_ORIGIN}
          designWidth={DESIGN_WIDTH}
          designHeight={DESIGN_HEIGHT}
          editable={editable}
          renderOverlayChrome={renderOverlayChrome}
        >
          {/* Registers the demo sidebar into the default shell's sidebar region.
              Renders nothing itself; the registration side-effect runs inside the
              HostShell provider tree (AdminProvider + ColabProvider). */}
          <SidebarRegistrar
            selfId={identity.id}
            nameFieldName={nameFieldName}
            onCommitName={commitName}
          />
        </HostShell>
      </div>
    </EditableContext.Provider>
  );

  // Gate presence entirely on the flag: when off, no `<ColabProvider>` mounts, no
  // socket connects, and no colab code path runs.
  if (!PRESENCE_ENABLED) return shell;

  // `<ColabProvider>` builds its own default Socket.IO transport from
  // `serverUrl`/`room`/`identity` (colab-ui@0.1.1's `createSocketIoTransport`):
  // it connects with the relay's `{ roomId, identity }` handshake, maps colab
  // envelopes onto the relay's discrete events, and buffers pre-connect sends.
  return (
    <ColabProvider
      // Key by the committed identity name so a name change fully remounts the
      // provider and re-joins the room cleanly with the new identity.
      key={identity.name}
      serverUrl={PRESENCE_SERVER_URL}
      room={PRESENCE_ROOM}
      identity={identity}
      interactions={PRESENCE_INTERACTIONS}
    >
      {shell}
    </ColabProvider>
  );
}
