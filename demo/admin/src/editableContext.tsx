/**
 * `EditableContext` — the shared, reactive "is the editor editable?" flag.
 *
 * It is `true` when the store view is the draft (`vce.viewVersion() === null`)
 * and `false` when viewing a published/historical version. `VersionControls` is
 * the sole writer — it calls `setEditable` whenever it changes the view (publish
 * / view-live / edit-draft / prev / next) — and the whole editor tree reads it to
 * gate the dashboard's `editable` props on `HostShell` / `Overlays` / `Palette`.
 *
 * Extracted into its own module (rather than living in `App`) so consumers like
 * `VersionControls` and `SidebarPanels` import the context directly, avoiding an
 * import cycle back through `App`.
 */

import { createContext, useContext } from "react";

export interface EditableContextValue {
  editable: boolean;
  setEditable: (editable: boolean) => void;
}

export const EditableContext = createContext<EditableContextValue | null>(null);

/** Reads the shared editable flag + its setter. Must be used inside `App`. */
export function useEditable(): EditableContextValue {
  const ctx = useContext(EditableContext);
  if (ctx === null) {
    throw new Error("useEditable must be used within <EditableProvider>");
  }
  return ctx;
}
