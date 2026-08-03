/**
 * The demo's `BlockType` registry (dashboard SIFR-T-0034).
 *
 * Supplies the two block types the demo palette + side panel offer — `text` and
 * `image`. Each block's `defaultValue()` seeds a freshly-inserted block, and
 * `renderField` provides the side-panel field editor whose `onEdit(patch)` flows
 * straight into an `edit` op → the VCE store's `updateContent`.
 *
 * The image block reuses the packaged {@link ImageField} (dashboard 0.1.8) for its
 * URL / upload / recent editor, keyed to the demo's `stardust-demo-uploads`
 * registry so previously-uploaded images survive. We keep the demo's own image
 * `defaultValue` (a placeholder URL) rather than the package's `imageBlockType`
 * (whose default is an empty string) so a freshly-inserted image seeds the
 * placeholder — which `EditPanel`'s focus-select relies on to auto-focus and
 * select the URL field on add.
 */

import type { ReactNode } from "react";
import { ImageField, type BlockType } from "@stardust-cms/dashboard";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";

const PLACEHOLDER_IMAGE = "https://placehold.co/480x240/6366f1/ffffff?text=New+image";

/** The demo's upload registry key — kept stable so recent uploads survive the swap. */
const DEMO_UPLOADS_KEY = "stardust-demo-uploads";

/** Map the packaged `ImageField`'s class-name slots onto the demo's `panel__*` styles. */
const IMAGE_FIELD_CLASSNAMES = {
  root: "panel__field",
  sourceSelect: "panel__select",
  control: "panel__control",
  hint: "panel__hint",
} as const;

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
    <ImageField
      content={content}
      onEdit={onEdit}
      classNames={IMAGE_FIELD_CLASSNAMES}
      uploadRegistryKey={DEMO_UPLOADS_KEY}
    />
  ),
};

/** The demo block-type registry, in palette display order. */
export const DEMO_BLOCK_TYPES: readonly BlockType[] = [textBlock, imageBlock];
