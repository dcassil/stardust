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
}

export function EditPanel({
  blockTypes,
  selectedTargetId,
  selectedContentId,
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
        <h2 className="panel__title">Content</h2>
        <p className="panel__hint">Click a block in the preview to edit it.</p>
      </section>
    );
  }

  const content: CmsContent = selected.content;
  const blockType = findBlockType(blockTypes, content.type);

  const onEdit = (patch: BlockFieldPatch): void => {
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
      <h2 className="panel__title">Content</h2>
      <dl className="panel__meta">
        <dt>id</dt>
        <dd>{content.id}</dd>
        <dt>type</dt>
        <dd>{content.type}</dd>
        <dt>target</dt>
        <dd>{selected.targetId}</dd>
      </dl>
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
    </section>
  );
}
