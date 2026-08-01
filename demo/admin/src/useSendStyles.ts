/**
 * Host-side `cms/updateStyles` sender.
 *
 * Mirrors the demo's `cms/sendElements` pattern: binds `frame-link-react`'s
 * generic `useSend` to the `cms/updateStyles` channel through a local registry
 * adapter (protocol `request` → frame-link `payload`). Style editing is a
 * host-app concern, so this lives in the demo rather than the library.
 *
 * This hook MUST be called inside `HostShell`'s `FrameLinkProvider` — the whole
 * shell (including the sidebar rendered by `renderLayout`) is nested under it,
 * so the {@link StylePanel} that consumes this is in-scope.
 */

import { useSend } from "frame-link-react";
import type {
  RequestOf,
  ResponseOf,
  StardustMessageKey,
  StyleUpdatePayload,
} from "@stardust-cms/iframe-adapter/protocol";

/** frame-link registry view of the Stardust protocol (payload ← request). */
type StardustFrameLinkRegistry = {
  [K in StardustMessageKey]: {
    payload: RequestOf<K>;
    response: ResponseOf<K>;
  };
};

/** Returns a sender that pushes one {@link StyleUpdatePayload} via `cms/updateStyles`. */
export function useSendStyles(): (
  payload: StyleUpdatePayload,
) => Promise<void> {
  return useSend<StardustFrameLinkRegistry, "cms/updateStyles">(
    "cms/updateStyles",
  );
}
