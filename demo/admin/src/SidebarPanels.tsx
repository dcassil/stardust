/**
 * `SidebarPanels` — the admin sidebar's selection-aware contents.
 *
 * Rendered INSIDE the `HostShell` tree (from `App`'s `renderLayout`), so it can
 * read the shell-tracked selection via the dashboard's `useHostSelection()` hook.
 * That selection feeds the field editor, the style panel, and — when presence is
 * on — the `colab` edit-lock publisher.
 *
 * EDIT-LOCK GATE — when presence is enabled, the presence-gated `PresenceSidebar`
 * (which owns the `colab` hooks) computes whether the SELECTED CONTENT ITEM is
 * held by a REMOTE participant and lifts that up here, so the Edit/Style panels —
 * which also render on the presence-OFF path, where colab hooks are absent — can
 * go read-only. The gate is keyed per content item, so editing a different item
 * in the same area stays fully editable.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Palette, useHostSelection } from "@stardust-cms/dashboard";
import { useEditLock } from "colab-ui/react";
import { useEditable } from "./editableContext";
import { DEMO_BLOCK_TYPES } from "./blockTypes";
import { VersionControls } from "./VersionControls";
import { EditPanel } from "./EditPanel";
import { StylePanel } from "./StylePanel";
import { PRESENCE_ENABLED } from "./presence/config";
import { contentScopeId } from "./presence/usePresenceSession";
import { PresenceIndicator } from "./presence/PresenceIndicator";

/** The per-item lock state the panels consume to gate editing read-only. */
export interface ContentLock {
  lockedByRemote: boolean;
  holderName: string | null;
}

const NO_LOCK: ContentLock = { lockedByRemote: false, holderName: null };

export interface SidebarPanelsProps {
  selfId: string;
}

export function SidebarPanels({ selfId }: SidebarPanelsProps): ReactNode {
  const { selectedTargetId, selectedContentId } = useHostSelection();
  const { editable } = useEditable();
  const [tab, setTab] = useState<"content" | "styles">("content");

  // Cooperative per-content-item edit-lock gate. Computed by the presence-gated
  // `PresenceSidebar` and lifted up here. Off by default; only set true when
  // presence is on and a remote participant holds the selected content item.
  const [remoteLock, setRemoteLock] = useState<ContentLock>(NO_LOCK);

  return (
    <>
      {/* Content | Styles tab switcher — pinned at the TOP of the sidebar. Only
          ONE panel renders at a time. The Add-blocks palette lives WITH the
          Content tab; Presence / Versioning stay outside the tabs. */}
      <section className="panel sidebar-tabs">
        {!editable && (
          <p className="sidebar-tabs__readonly" role="status">
            Read-only — viewing a published version
          </p>
        )}
        <div className="tabbar" role="tablist" aria-label="Editor panels">
          <button
            type="button"
            role="tab"
            className={`tabbar__tab ${tab === "content" ? "tabbar__tab--active" : ""}`}
            aria-selected={tab === "content"}
            data-testid="sidebar-tab-content"
            onClick={() => {
              setTab("content");
            }}
          >
            Content
          </button>
          <button
            type="button"
            role="tab"
            className={`tabbar__tab ${tab === "styles" ? "tabbar__tab--active" : ""}`}
            aria-selected={tab === "styles"}
            data-testid="sidebar-tab-styles"
            onClick={() => {
              setTab("styles");
            }}
          >
            Styles
          </button>
        </div>
      </section>

      {tab === "content" ? (
        <>
          {/* Add-blocks palette grouped under the Content tab. Disables its drag
              when the editor is read-only. */}
          <Palette blockTypes={DEMO_BLOCK_TYPES} editable={editable} />
          <EditPanel
            blockTypes={DEMO_BLOCK_TYPES}
            selectedTargetId={selectedTargetId}
            selectedContentId={selectedContentId}
            lockedByRemote={remoteLock.lockedByRemote}
            lockHolderName={remoteLock.holderName}
          />
        </>
      ) : (
        <StylePanel
          selectedTargetId={selectedTargetId}
          selectedContentId={selectedContentId}
          lockedByRemote={remoteLock.lockedByRemote}
          lockHolderName={remoteLock.holderName}
        />
      )}
      {PRESENCE_ENABLED && (
        <PresenceSidebar
          selfId={selfId}
          selectedTargetId={selectedTargetId}
          selectedContentId={selectedContentId}
          onLockChange={setRemoteLock}
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
  onLockChange: (lock: ContentLock) => void;
}

/**
 * The presence-only sidebar slice, mounted inside `<ColabProvider>` (via the
 * shell tree) so its `colab` hooks resolve. It publishes the selected content
 * item as an edit-lock (cooperative, non-stealing) and shows the participant
 * indicator. It also computes whether the SELECTED CONTENT ITEM is locked by a
 * REMOTE participant and lifts that up via `onLockChange` so the Edit/Style
 * panels can go read-only for that specific item.
 */
function PresenceSidebar({
  selectedTargetId,
  selectedContentId,
  selfId,
  onLockChange,
}: PresenceSidebarProps): ReactNode {
  // colab-ui's packaged edit-lock hook OWNS the whole lifecycle: it cooperatively
  // acquires the scope (when free), never steals, safety-clears on reload/leave
  // and after idle, and resolves the current remote holder. It both publishes the
  // local lock AND reports whether a remote holds it — replacing the demo's
  // separate `usePublishEditLock` + `useContentLock`.
  const { lockedByRemote, holder } = useEditLock(
    contentScopeId(selectedTargetId, selectedContentId),
    selfId,
  );

  // Push the resolved lock state up to `SidebarPanels`. Effect (not render) so we
  // never call a parent setter during our own render.
  useEffect(() => {
    onLockChange({ lockedByRemote, holderName: holder });
  }, [onLockChange, lockedByRemote, holder]);

  // On unmount (presence flag flips off, unlikely) clear the gate so panels
  // don't stay stuck read-only.
  useEffect(() => {
    return () => {
      onLockChange(NO_LOCK);
    };
  }, [onLockChange]);

  return <PresenceIndicator selfId={selfId} />;
}
