/**
 * `SidebarRegistrar` — mounts the demo's sidebar contents into the default App
 * Shell's sidebar region via the dashboard's `panels` extension seam.
 *
 * The 0.2 default `AdminShell` auto-renders every registered `panels`
 * contribution inside its sidebar region (`useExtensions("panels")`). Rather than
 * hand-roll the layout with the deprecated `renderLayout` render-prop, the demo
 * now REGISTERS its editor sidebar (name field + Content/Styles panels + presence
 * + version controls) as a single panel contribution. This component renders
 * nothing itself — it only performs the registration (a side effect), so it can
 * live anywhere inside the `HostShell` provider tree (we mount it in the overlay
 * `children`). The contribution's `render()` output is what lands in the sidebar.
 *
 * PROVIDER TREE — the registration runs inside `HostShell`'s `AdminProvider`
 * (giving the panel `useSelection` + the store) and, when presence is on, inside
 * `<ColabProvider>` (giving the panel the `colab` edit-lock hooks), because the
 * whole shell is wrapped by `<ColabProvider>` in `App`.
 */

import { useMemo, type ReactNode } from "react";
import { useRegisterExtension, type PanelContribution } from "@stardust-cms/dashboard";
import { PRESENCE_ENABLED } from "./presence/config";
import { NameField } from "./NameField";
import { SidebarPanels } from "./SidebarPanels";

export interface SidebarRegistrarProps {
  /** The local participant id (stable per tab). */
  selfId: string;
  /** The current display name shown in the name field (presence only). */
  nameFieldName: string;
  /** Commit a new display name (presence only). */
  onCommitName: (name: string) => void;
}

export function SidebarRegistrar({
  selfId,
  nameFieldName,
  onCommitName,
}: SidebarRegistrarProps): ReactNode {
  const contribution = useMemo<PanelContribution>(
    () => ({
      id: "demo-editor-sidebar",
      render: (): ReactNode => (
        <div className="admin-sidebar">
          {PRESENCE_ENABLED && (
            <NameField initialName={nameFieldName} onCommit={onCommitName} />
          )}
          <SidebarPanels selfId={selfId} />
        </div>
      ),
    }),
    [selfId, nameFieldName, onCommitName],
  );

  useRegisterExtension("panels", contribution);
  return null;
}
