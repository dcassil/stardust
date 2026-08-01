/**
 * `StylePanel` — the demo's selection-aware style editor.
 *
 * A deliberately small panel — NOT a full visual editor. For the currently
 * selected content item it offers only allowlisted controls (color + font-size)
 * scoped to the item's `data-style-group` (falling back to its `type`), emitting
 * `cms/updateStyles({ styleGroup, type, property, value })` over frame-link on
 * each change. The iframe adapter validates every value against the allowlist
 * before injecting into its managed `<style>` (StyleFeature), so nothing unsafe
 * — and nothing outside that managed stylesheet — is ever touched.
 *
 * Controls are constrained by the published style exports:
 *  - `isAllowed(type, property)` decides which controls to render at all, so the
 *    panel can never offer a property the engine would drop;
 *  - `validateColor` / `validatePx` normalize + reject candidate values BEFORE
 *    they are sent, so invalid input never reaches the wire.
 *
 * Reads the selection + live snapshot from the shell's `useContentStore`, using
 * the same `selectedTargetId`/`selectedContentId` the rest of the sidebar uses.
 */

import { useMemo, type ChangeEvent, type ReactNode } from "react";
import { useContentStore } from "@stardust-cms/dashboard";
import {
  isAllowed,
  validateColor,
  validatePx,
  type StyleElementType,
} from "@stardust-cms/iframe-adapter";
import type { StyleUpdatePayload } from "@stardust-cms/iframe-adapter/protocol";
import { useSendStyles } from "./useSendStyles";

export interface StylePanelProps {
  selectedTargetId: string | null;
  selectedContentId: string | null;
}

/**
 * The allowlist bucket a content item's styles are scoped under. Text/image
 * blocks both style text-like properties (color, font-size); containers use the
 * container bucket. Grounded in the published {@link StyleElementType} keys.
 */
function bucketFor(contentType: string): StyleElementType {
  return contentType === "container" ? "container" : "text";
}

/** The allowlisted style controls for one selected item's group/bucket. */
function StyleControls({
  styleGroup,
  type,
}: {
  styleGroup: string;
  type: StyleElementType;
}): ReactNode {
  const sendStyles = useSendStyles();

  /** Send a single validated declaration, dropping invalid candidates. */
  const send = (property: string, value: string | null): void => {
    if (value === null) return; // rejected by the validator — never send.
    const payload: StyleUpdatePayload = { styleGroup, type, property, value };
    void sendStyles(payload);
  };

  const onColor = (e: ChangeEvent<HTMLInputElement>): void => {
    send("color", validateColor(e.target.value));
  };
  const onFontSize = (e: ChangeEvent<HTMLInputElement>): void => {
    send("font-size", validatePx(e.target.value));
  };

  return (
    <section
      className="panel"
      data-testid="style-panel"
      data-style-group={styleGroup}
    >
      <h2 className="panel__title">Style</h2>
      <dl className="panel__meta">
        <dt>group</dt>
        <dd>{styleGroup}</dd>
        <dt>type</dt>
        <dd>{type}</dd>
      </dl>

      {isAllowed(type, "color") && (
        <label className="panel__field">
          <span>Color</span>
          <input
            type="color"
            defaultValue="#111111"
            onChange={onColor}
            data-testid="style-color"
          />
        </label>
      )}

      {isAllowed(type, "font-size") && (
        <label className="panel__field">
          <span>Font size (px)</span>
          <input
            type="number"
            min={0}
            defaultValue={16}
            onChange={onFontSize}
            data-testid="style-font-size"
          />
        </label>
      )}
    </section>
  );
}

export function StylePanel({
  selectedTargetId,
  selectedContentId,
}: StylePanelProps): ReactNode {
  const { snapshot } = useContentStore();

  const selected = useMemo(() => {
    if (!selectedTargetId || !selectedContentId) return undefined;
    return snapshot.find(
      (p) =>
        p.targetId === selectedTargetId && p.contentId === selectedContentId,
    );
  }, [snapshot, selectedTargetId, selectedContentId]);

  if (!selected) {
    return (
      <section className="panel" data-testid="style-panel-empty">
        <h2 className="panel__title">Style</h2>
        <p className="panel__hint">Select a block to style its group.</p>
      </section>
    );
  }

  return (
    <StyleControls
      styleGroup={selected.content.styleGroup ?? selected.content.type}
      type={bucketFor(selected.content.type)}
    />
  );
}
