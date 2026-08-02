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
  /**
   * Cooperative edit-lock gate: when a REMOTE participant holds the selected
   * target, the style controls become read-only and show a lock banner.
   */
  lockedByRemote?: boolean;
  /** Display name of the remote lock holder, for the banner copy. */
  lockHolderName?: string | null;
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
  lockedByRemote,
  lockHolderName,
}: {
  styleGroup: string;
  type: StyleElementType;
  lockedByRemote: boolean;
  lockHolderName: string | null;
}): ReactNode {
  const sendStyles = useSendStyles();

  /** Send a single validated declaration, dropping invalid candidates. */
  const send = (property: string, value: string | null): void => {
    if (lockedByRemote) return; // remote participant is editing — read-only.
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
      <div className="panel__head">
        <h2 className="panel__title">Style</h2>
        <span className="panel__chip">{styleGroup}</span>
      </div>
      <p className="panel__hint">Applies to every {styleGroup} block on the page.</p>

      {lockedByRemote && (
        <p className="panel__lock" role="status" data-testid="edit-lock-banner">
          🔒 {lockHolderName ?? "Someone"} is editing — read-only
        </p>
      )}

      <fieldset className="panel__fieldset" disabled={lockedByRemote}>
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
      </fieldset>
    </section>
  );
}

export function StylePanel({
  selectedTargetId,
  selectedContentId,
  lockedByRemote = false,
  lockHolderName = null,
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
        <div className="panel__head">
          <h2 className="panel__title">Style</h2>
        </div>
        <p className="panel__hint">
          Select a block to adjust its color and type across the page.
        </p>
      </section>
    );
  }

  return (
    <StyleControls
      styleGroup={selected.content.styleGroup ?? selected.content.type}
      type={bucketFor(selected.content.type)}
      lockedByRemote={lockedByRemote}
      lockHolderName={lockHolderName}
    />
  );
}
