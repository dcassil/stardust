/**
 * The demo's `BlockType` registry (dashboard SIFR-T-0034).
 *
 * Supplies the two block types the demo palette + side panel offer — `text` and
 * `image` — matching the old hand-rolled palette. Each block's `defaultValue()`
 * seeds a freshly-inserted block, and `renderField` provides the side-panel field
 * editor whose `onEdit(patch)` flows straight into an `edit` op → the VCE store's
 * `updateContent`.
 */

import type { ReactNode } from "react";
import type { BlockType } from "@stardust-cms/dashboard";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";

const PLACEHOLDER_IMAGE = "https://placehold.co/480x240/6366f1/ffffff?text=New+image";

const textBlock: BlockType<"text"> = {
  type: "text",
  label: "Text",
  defaultValue: () => "New text block",
  renderField: (content: CmsContent, onEdit): ReactNode => (
    <label className="panel__field">
      <span>Text</span>
      <textarea
        rows={4}
        data-testid="panel-text"
        value={content.value ?? ""}
        onChange={(e) => {
          onEdit({ value: e.target.value });
        }}
      />
    </label>
  ),
};

const imageBlock: BlockType<"image"> = {
  type: "image",
  label: "Image",
  defaultValue: () => PLACEHOLDER_IMAGE,
  renderField: (content: CmsContent, onEdit): ReactNode => (
    <label className="panel__field">
      <span>Image URL</span>
      <input
        type="text"
        data-testid="panel-image"
        value={content.value ?? ""}
        onChange={(e) => {
          onEdit({ value: e.target.value });
        }}
      />
    </label>
  ),
};

/** The demo block-type registry, in palette display order. */
export const DEMO_BLOCK_TYPES: readonly BlockType[] = [textBlock, imageBlock];
