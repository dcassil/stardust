/**
 * `EditPanel` — the demo's selection-aware field editor.
 *
 * A thin custom replacement for the dashboard's bundled `SidePanel`. It resolves
 * the selected item's block type from the registry and renders its
 * `renderField(content, onEdit)`, routing each edit through
 * `useContentStore().apply`. With dashboard 0.1.2 the shell re-injects on EVERY
 * store snapshot change, so an `edit` op applied here reaches the iframe live
 * automatically — the old re-inject bridge workaround is gone.
 */

import { useMemo, type ReactNode } from "react";
import {
  useContentStore,
  findBlockType,
  type BlockTypeRegistry,
  type BlockFieldPatch,
} from "@stardust-cms/dashboard";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";

export interface EditPanelProps {
  blockTypes: BlockTypeRegistry;
  selectedTargetId: string | null;
  selectedContentId: string | null;
  /**
   * Cooperative edit-lock gate: when a REMOTE participant holds the selected
   * target, the field editor becomes read-only and shows a lock banner. Only set
   * true when presence is enabled and someone else holds the selection.
   */
  lockedByRemote?: boolean;
  /** Display name of the remote lock holder, for the banner copy. */
  lockHolderName?: string | null;
}

export function EditPanel({
  blockTypes,
  selectedTargetId,
  selectedContentId,
  lockedByRemote = false,
  lockHolderName = null,
}: EditPanelProps): ReactNode {
  const store = useContentStore();
  const { snapshot } = store;

  const selected = useMemo(() => {
    if (!selectedTargetId || !selectedContentId) return undefined;
    return snapshot.find(
      (p) => p.targetId === selectedTargetId && p.contentId === selectedContentId,
    );
  }, [snapshot, selectedTargetId, selectedContentId]);

  if (!selected) {
    return (
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Edit</h2>
        </div>
        <div className="panel__empty">
          <span className="panel__empty-icon" aria-hidden="true">✦</span>
          <p className="panel__hint">
            Select a block in the preview to edit its content here.
          </p>
        </div>
      </section>
    );
  }

  const content: CmsContent = selected.content;
  const blockType = findBlockType(blockTypes, content.type);

  const onEdit = (patch: BlockFieldPatch): void => {
    // Cooperative gate: never mutate a target a remote participant is editing,
    // even if some field control slipped past the disabled fieldset.
    if (lockedByRemote) return;
    store.apply({
      kind: "edit",
      targetId: selected.targetId,
      contentId: selected.contentId,
      patch,
    });
    // The shell re-injects on this snapshot change (dashboard 0.1.2), so the
    // edit reaches the iframe live with no further action here.
  };

  return (
    <section className="panel" data-selected-id={content.id}>
      <div className="panel__head">
        <h2 className="panel__title">Edit</h2>
        <span className="panel__chip">{blockType?.label ?? content.type}</span>
      </div>
      {lockedByRemote && (
        <p className="panel__lock" role="status" data-testid="edit-lock-banner">
          🔒 {lockHolderName ?? "Someone"} is editing — read-only
        </p>
      )}
      {/* A disabled fieldset natively disables every descendant form control,
          including the block type's own `renderField` inputs, so a remotely
          locked item can't be edited. */}
      <fieldset className="panel__fieldset" disabled={lockedByRemote}>
        {blockType?.renderField ? (
          blockType.renderField(content, onEdit)
        ) : (
          <label className="panel__field">
            <span>Value</span>
            <textarea
              rows={4}
              data-testid="panel-default-field"
              value={content.value ?? ""}
              onChange={(e) => {
                onEdit({ value: e.target.value });
              }}
            />
          </label>
        )}
      </fieldset>
      <dl className="panel__meta panel__meta--footer">
        <dt>target</dt>
        <dd>{selected.targetId}</dd>
        <dt>id</dt>
        <dd>{content.id}</dd>
      </dl>
    </section>
  );
}
