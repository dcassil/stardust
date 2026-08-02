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

import { useMemo, useState, type ReactNode } from "react";
import {
  EditableContext,
  type EditableContextValue,
} from "./editableContext";
import {
  HostShell,
  Overlays,
  type OverlayChromeParts,
  type HostShellLayoutParts,
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
import { PresenceOverlays } from "./presence/PresenceOverlays";
import { SidebarPanels } from "./SidebarPanels";

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

  const commitName = (raw: string): void => {
    const trimmed = raw.trim();
    writeStoredName(trimmed);
    setCommittedName(trimmed ? trimmed : null);
  };

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

  const renderOverlayChrome = (parts: OverlayChromeParts): ReactNode => (
    <OverlayChrome parts={parts} selfId={identity.id} />
  );

  const renderLayout = ({ canvas, status }: HostShellLayoutParts): ReactNode => (
    <div className="admin-layout">
      <TopBar
        status={status}
        nameFieldName={committedName ?? identity.name}
        onCommitName={commitName}
      />
      <div className="admin-body">
        <div className="admin-main">{canvas}</div>
        <aside className="admin-sidebar">
          <SidebarPanels selfId={identity.id} />
        </aside>
      </div>
    </div>
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
        renderLayout={renderLayout}
      />
    </div>
    </EditableContext.Provider>
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
      // Key by the committed identity name so a name change fully remounts the
      // provider and re-joins the room cleanly with the new identity (colab-ui
      // builds the session from `identity` in a memo; a fresh mount guarantees a
      // clean handshake). A brief reconnect on name-commit is acceptable.
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

interface OverlayChromeProps {
  parts: OverlayChromeParts;
  selfId: string;
}

/**
 * The overlay chrome rendered by `HostShell`'s `renderOverlayChrome` slot: the
 * bundled editing {@link Overlays} plus (when presence is on) the `colab`
 * {@link PresenceOverlays}. The shell-forwarded `parts.pointer` (the local user's
 * pointer over the iframe, normalized 0..1) drives the full-page collaboration
 * cursor.
 */
function OverlayChrome({ parts, selfId }: OverlayChromeProps): ReactNode {
  return (
    <>
      {/* Gate the demo's own overlays with the shell-forwarded `parts.editable`
          (which reflects `HostShell editable={editable}`): selection highlight +
          delete (x) + drop become inert in read-only. */}
      <Overlays
        targets={parts.targets}
        callbacks={parts.callbacks}
        selectedTargetId={parts.selectedTargetId}
        selectedContentId={parts.selectedContentId}
        editable={parts.editable}
      />
      {/* Presence overlays still render in read-only — viewing is fine. */}
      {PRESENCE_ENABLED && (
        <PresenceOverlays
          targets={parts.targets}
          selfId={selfId}
          pointer={parts.pointer}
        />
      )}
    </>
  );
}

interface TopBarProps {
  status: ReactNode;
  nameFieldName: string;
  onCommitName: (name: string) => void;
}

/** The admin top bar: brand, per-tab name field (presence only), and status. */
function TopBar({
  status,
  nameFieldName,
  onCommitName,
}: TopBarProps): ReactNode {
  return (
    <header className="admin-topbar">
      <div className="admin-brand">
        <span className="admin-brand__mark" aria-hidden="true" />
        <span className="admin-brand__word">Northwind</span>
        <span className="admin-brand__sub">Editor</span>
      </div>
      {/* Per-tab display-name field. Only shown when presence is on. Commits on
          Enter/blur, driving the colab identity. */}
      {PRESENCE_ENABLED && (
        <NameField initialName={nameFieldName} onCommit={onCommitName} />
      )}
      {/* Shell-owned connection status (dot + label + origin/scale meta). */}
      {status}
    </header>
  );
}

interface NameFieldProps {
  initialName: string;
  onCommit: (name: string) => void;
}

/**
 * Top-bar display-name input. Local, uncontrolled-ish state while typing; commits
 * the value to the colab identity ONLY on Enter or blur (never per keystroke), so
 * a name change triggers exactly one identity re-join rather than one per key.
 */
function NameField({ initialName, onCommit }: NameFieldProps): ReactNode {
  const [value, setValue] = useState(initialName);

  const commit = (): void => {
    if (value.trim() !== initialName.trim()) {
      onCommit(value);
    }
  };

  return (
    <label className="admin-name">
      <span className="admin-name__label">You</span>
      <input
        type="text"
        className="admin-name__input"
        data-testid="display-name-input"
        placeholder="Your name"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
