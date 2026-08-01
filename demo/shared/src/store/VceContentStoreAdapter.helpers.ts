/**
 * Type map, boundary casts, and pure projection helpers for
 * {@link VceContentStoreAdapter}. Split out of `VceContentStoreAdapter.ts` to
 * keep each module within the size budget.
 *
 * Strict TS, no `any`. VCE's opaque branded ids are produced only by the engine;
 * the few string↔brand crossings are localized to the `asTargetId` /
 * `asCollectionId` / `asId` helpers below — the adapter's sanctioned boundary
 * casts (the engine itself performs the same at its edges).
 */

import type { ContentSnapshot } from "@stardust-cms/dashboard";
import type {
  ContentState,
  ContentSnapshot as VceSnapshot,
  ContentRecord,
  OperationDeps,
  TargetId,
  ContentCollectionId,
  Id,
} from "versioned-content-engine";
import type {
  CmsContent,
  ContentPayload,
} from "@stardust-cms/iframe-adapter/protocol";

/**
 * The demo's content-type map for the engine. Every demo block stores its full
 * {@link CmsContent} as the VCE record payload — so projecting back is a direct
 * copy and the `content.id` can be stamped with the collection id. Keys mirror
 * the demo's `CmsContent.type` discriminants.
 */
export interface DemoContentTypeMap {
  text: CmsContent;
  image: CmsContent;
  container: CmsContent;
}

export type DemoState = ContentState<DemoContentTypeMap>;
export type DemoRecord = ContentRecord<DemoContentTypeMap>;

/** Sanctioned boundary casts to the engine's opaque branded id types. */
export const asTargetId = (id: string): TargetId => id as unknown as TargetId;
export const asCollectionId = (id: string): ContentCollectionId =>
  id as unknown as ContentCollectionId;
export const asId = (id: string): Id => id as unknown as Id;

/**
 * An id strategy that mints a fixed `collectionId` (the seed item's original
 * `content.id`) and a derived record `id`, so a seeded collection keeps its
 * original stable identity. Used only during seeding.
 */
export function fixedIdStrategy(
  collectionId: string,
): OperationDeps["idStrategy"] {
  let n = 0;
  return {
    newCollectionId: () => asCollectionId(collectionId),
    newId: () => asId(`${collectionId}#${String(n++)}`),
  };
}

/**
 * Build a `CmsContent` from an `InsertOp.payload`. The payload always carries a
 * `type`; the shell has already merged the block's `defaultValue()` in, so any
 * `value` / `styleGroup` / `column` present are copied through. `id` is left to
 * be stamped from the minted collection id at projection time.
 */
export function insertPayloadToContent(payload: {
  type: string;
  [key: string]: unknown;
}): CmsContent {
  const content: CmsContent = {
    id: "",
    type: payload.type as CmsContent["type"],
  };
  if (typeof payload.value === "string") content.value = payload.value;
  if (typeof payload.styleGroup === "string") {
    content.styleGroup = payload.styleGroup;
  }
  if (typeof payload.column === "boolean") content.column = payload.column;
  return content;
}

/**
 * Project a VCE snapshot to ordered dashboard `ContentPayload[]`. One payload
 * per record; `contentId` and `content.id` are the record's `collectionId` (the
 * identity the editor addresses). Fresh array + fresh objects each call.
 */
export function project(
  snapshot: VceSnapshot<DemoContentTypeMap>,
): ContentSnapshot {
  const payloads: ContentPayload[] = [];
  for (const [targetId, records] of snapshot) {
    for (const record of records) {
      const collectionId = String(record.collectionId);
      const content: CmsContent = { ...record.payload, id: collectionId };
      payloads.push({
        targetId: String(targetId),
        contentId: collectionId,
        index: record.index,
        content,
      });
    }
  }
  return payloads;
}
