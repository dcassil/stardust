/**
 * `VceContentStoreAdapter` — a {@link ContentStoreAdapter} (from
 * `@stardust-cms/dashboard`) backed by the pure `versioned-content-engine`.
 *
 * This is the demo's swap of the old in-memory `InMemoryContentStore` for a real
 * versioned engine, so the dashboard `HostShell` gets draft/live/publish/version
 * history for free. The adapter is the single seam: `HostShell` hands it
 * structured {@link HostContentOp}s and re-injects the returned
 * {@link ContentSnapshot}; internally we translate each op to a VCE operation and
 * project a materialized VCE snapshot back to dashboard `ContentPayload[]`.
 *
 * ## Identity model — the load-bearing mapping
 *
 * VCE addresses content by `collectionId` (stable across versions). The dashboard
 * / iframe-adapter world addresses content by `contentId` (the rendered element
 * id, `ContentPayload.contentId` === `CmsContent.id`). We collapse the two: the
 * `contentId` we expose in every projected payload IS the VCE `collectionId`
 * string. So `delete`/`edit`/`move` can look a collection up directly by the id
 * the overlay/panel already carries, with no side table.
 *
 * A brand-new `insert` op carries no contentId (the shell lets the store mint
 * one). We call `createContent`, which mints a fresh `collectionId`; the next
 * materialization surfaces that collection with `contentId = collectionId` and
 * `content.id = collectionId`, so subsequent edits address it.
 *
 * ## Op → VCE mapping
 *
 *  - `insert` → `createContent(target, index, type, payload)` — payload maps the
 *    insert defaults (`value`, `styleGroup`, `column`) into a `CmsContent`-shaped
 *    VCE payload.
 *  - `move`   → `moveContent(collectionId, source, dest, index)`.
 *  - `edit`   → `updateContent(collectionId, type, payload)` (patch merged onto
 *    the current payload).
 *  - `delete` → `deleteContent(target, collectionId)`.
 *  - `select` → no-op; returns the current snapshot unchanged.
 *
 * ## Snapshot projection
 *
 * `materialize`/`getLive`/`getDraft` return a VCE `ContentSnapshot`
 * (`ReadonlyMap<TargetId, ContentRecord[]>`). We flatten it to an ordered
 * `ContentPayload[]`, one payload per record, `content` reconstructed from the
 * record's `payload` (a `CmsContent`). Each projection is a FRESH array so React
 * consumers see a new identity.
 *
 * Strict TS, no `any`. VCE's opaque branded ids are produced only by the engine /
 * its strategies; the few string↔brand crossings are localized to the tiny
 * `asTargetId` / `asCollectionId` helpers below, which are the adapter's
 * sanctioned boundary casts (the engine itself performs the same at its edges).
 */

import type {
  ContentStoreAdapter,
  ContentSnapshot,
  HostContentOp,
} from "@stardust-cms/dashboard";
import type { CmsContent } from "@stardust-cms/iframe-adapter/protocol";
import {
  createContent,
  updateContent,
  moveContent,
  deleteContent,
  publish,
  getDraft,
  getLive,
  materialize,
  createDefaultIdStrategy,
  createDefaultVersionClock,
  type OperationDeps,
  type VersionClock,
  type Version,
} from "versioned-content-engine";
import type { SeedItem } from "../content-model.js";
import {
  asCollectionId,
  asTargetId,
  fixedIdStrategy,
  insertPayloadToContent,
  project,
  type DemoContentTypeMap,
  type DemoRecord,
  type DemoState,
} from "./VceContentStoreAdapter.helpers.js";

export class VceContentStoreAdapter implements ContentStoreAdapter {
  #state: DemoState;
  #clock: VersionClock;
  readonly #idStrategy: OperationDeps["idStrategy"];
  /**
   * The version the editor is currently VIEWING. `null` = the live draft (normal
   * editing). A number pins a historical/live projection so `getSnapshot()` (and
   * therefore the shell's re-injection) surfaces that version instead of the
   * draft. Any mutating op resets it to `null` so editing always returns to the
   * draft.
   */
  #viewVersion: number | null = null;

  /** Effect deps threaded into every op, always at the CURRENT clock. */
  get #deps(): OperationDeps {
    return { idStrategy: this.#idStrategy, clock: this.#clock };
  }

  constructor(seed: readonly SeedItem[]) {
    this.#clock = createDefaultVersionClock(0);
    this.#idStrategy = createDefaultIdStrategy("demo-");
    // Seed every item as a create at the draft version, then publish once so the
    // seed is the initial LIVE content (draft === live at start).
    //
    // Seed collections are minted with their ORIGINAL seed `content.id` as the
    // VCE collectionId (via a dedicated seeding id strategy). This keeps the
    // projected `content.id` stable for seed items — critical for the `container`
    // block, whose child target ids are derived at render time as
    // `${content.id}.1` / `${content.id}.2`: if the container's id drifted to a
    // minted `demo-*` id, the seeded child columns (in `split-col.1/.2`) would no
    // longer render. New inserts still use the default minting strategy.
    let state: DemoState = new Map();
    for (const item of seed) {
      const seedDeps: OperationDeps = {
        idStrategy: fixedIdStrategy(item.content.id),
        clock: this.#clock,
      };
      state = createContent<DemoContentTypeMap>(
        state,
        {
          target: asTargetId(item.targetId),
          index: item.index,
          type: item.content.type as keyof DemoContentTypeMap,
          payload: item.content,
        },
        seedDeps,
      );
    }
    this.#state = state;
    // Publish the seed so it is live, and open a fresh draft above it.
    const published = publish(this.#state, this.#clock);
    this.#state = published.state;
    this.#clock = published.clock;
  }

  /**
   * The snapshot the editor currently views: the pinned historical/live version
   * when {@link setViewVersion} is active, otherwise the live draft. This is what
   * the shell re-injects, so pinning a version shows it live in the iframe.
   */
  getSnapshot(): ContentSnapshot {
    if (this.#viewVersion !== null) {
      return project(materialize(this.#state, this.#viewVersion as unknown as Version));
    }
    return project(getDraft(this.#state, this.#clock));
  }

  /**
   * Pin the editor's view to a historical/live `version` (or `null` to return to
   * the live draft). Does not mutate content; the caller triggers a re-inject
   * (e.g. via a `select` op through the shell) so the pinned version shows.
   */
  setViewVersion(version: number | null): void {
    this.#viewVersion = version;
  }

  /** The current live version number (highest published). */
  liveVersion(): number {
    return Number(this.#clock.live());
  }

  /** The version currently being viewed, or `null` for the live draft. */
  viewVersion(): number | null {
    return this.#viewVersion;
  }

  getDraft(): ContentSnapshot {
    return project(getDraft(this.#state, this.#clock));
  }

  getLive(): ContentSnapshot {
    return project(getLive(this.#state, this.#clock));
  }

  apply(op: HostContentOp): ContentSnapshot {
    // Any content mutation returns the editor to the live draft (a pinned
    // historical view is view-only). `select` preserves the current view so the
    // version-navigation control can re-inject a pinned version through it.
    if (op.kind !== "select") this.#viewVersion = null;
    switch (op.kind) {
      case "insert": {
        const content = insertPayloadToContent(op.payload);
        this.#state = createContent<DemoContentTypeMap>(
          this.#state,
          {
            target: asTargetId(op.targetId),
            index: op.index,
            type: content.type as keyof DemoContentTypeMap,
            payload: content,
          },
          this.#deps,
        );
        break;
      }
      case "move": {
        const collectionId = op.from.contentId;
        if (collectionId) {
          this.#state = moveContent<DemoContentTypeMap>(
            this.#state,
            {
              collectionId: asCollectionId(collectionId),
              source: asTargetId(op.from.targetId),
              dest: asTargetId(op.to.targetId),
              index: op.to.index,
            },
            this.#deps,
          );
        }
        break;
      }
      case "edit": {
        const current = this.#findDraftRecord(op.targetId, op.contentId);
        if (current) {
          const nextContent: CmsContent = {
            ...current.payload,
            ...op.patch,
            id: op.contentId,
          };
          this.#state = updateContent<DemoContentTypeMap>(
            this.#state,
            {
              collectionId: asCollectionId(op.contentId),
              type: current.type,
              payload: nextContent,
            },
            this.#deps,
          );
        }
        break;
      }
      case "delete": {
        this.#state = deleteContent<DemoContentTypeMap>(
          this.#state,
          {
            target: asTargetId(op.targetId),
            collectionId: asCollectionId(op.contentId),
          },
          this.#deps,
        );
        break;
      }
      case "select":
        // No content mutation; return the current snapshot unchanged.
        break;
    }
    return this.getSnapshot();
  }

  publish(): ContentSnapshot {
    const result = publish(this.#state, this.#clock);
    this.#state = result.state;
    this.#clock = result.clock;
    // After publish, the editor's draft is empty-diff above the new live; return
    // the new live projection so the caller re-injects the published content.
    return this.getLive();
  }

  materializeVersion(version: string): ContentSnapshot {
    const v = Number(version) as unknown as Version;
    return project(materialize(this.#state, v));
  }

  /** Locate a collection's current draft record (winner) in a target. */
  #findDraftRecord(targetId: string, collectionId: string): DemoRecord | undefined {
    const snap = getDraft(this.#state, this.#clock);
    const records = snap.get(asTargetId(targetId));
    return records?.find((r) => String(r.collectionId) === collectionId);
  }
}
