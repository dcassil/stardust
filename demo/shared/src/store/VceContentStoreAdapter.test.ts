/**
 * Unit tests for the VCE-backed {@link VceContentStoreAdapter} — verifies the
 * dashboard `HostContentOp` → versioned-content-engine op mapping and the
 * draft/live/publish/version-history projection back to `ContentPayload[]`.
 */

import { describe, it, expect } from "vitest";
import { createDemoContentStore, VceContentStoreAdapter } from ".";
import { SEED_CONTENT } from "../content-model.js";

describe("VceContentStoreAdapter", () => {
  it("seeds the demo content and projects it as ContentPayload[]", () => {
    const store = createDemoContentStore();
    const snap = store.getSnapshot();
    // Every seed item surfaces as one payload.
    expect(snap.length).toBe(SEED_CONTENT.length);
    const hero = snap.filter((p) => p.targetId === "hero");
    expect(hero.length).toBe(2);
    expect(hero[0]?.content.type).toBe("text");
    // contentId === content.id (both the VCE collectionId).
    expect(hero[0]?.contentId).toBe(hero[0]?.content.id);
  });

  it("insert maps to createContent and appears in the draft snapshot", () => {
    const store = createDemoContentStore();
    const before = store.getSnapshot().filter((p) => p.targetId === "intro").length;
    const snap = store.apply({
      kind: "insert",
      targetId: "intro",
      index: 5,
      payload: { type: "text", value: "Added" },
    });
    const intro = snap.filter((p) => p.targetId === "intro");
    expect(intro.length).toBe(before + 1);
    expect(intro.some((p) => p.content.value === "Added")).toBe(true);
  });

  it("edit maps to updateContent (patch merged onto the current payload)", () => {
    const store = createDemoContentStore();
    const heroFirst = store.getSnapshot().find((p) => p.targetId === "hero");
    expect(heroFirst).toBeDefined();
    const snap = store.apply({
      kind: "edit",
      targetId: "hero",
      contentId: heroFirst!.contentId,
      patch: { value: "Edited hero" },
    });
    const edited = snap.find((p) => p.contentId === heroFirst!.contentId);
    expect(edited?.content.value).toBe("Edited hero");
  });

  it("delete maps to deleteContent and removes the item from the draft", () => {
    const store = createDemoContentStore();
    const heroFirst = store.getSnapshot().find((p) => p.targetId === "hero")!;
    const snap = store.apply({
      kind: "delete",
      targetId: "hero",
      contentId: heroFirst.contentId,
    });
    expect(snap.some((p) => p.contentId === heroFirst.contentId)).toBe(false);
  });

  it("move reorders an existing on-page item within its target (drag-to-front)", () => {
    // Seed a target whose SECOND item's id is lexicographically GREATER than the
    // first's, so the collision tie-break (asc collectionId) would order them the
    // WRONG way. Items: "a-top" (0), "z-bottom" (1). Drag "z-bottom" to the front
    // (drop index 0, colliding with "a-top"). The requested order is
    // [z-bottom, a-top] — but asc-collectionId tie-break would keep "a-top" first.
    // Pre-fix this silently failed (item landed in the wrong slot); the half-step
    // fix sorts the moved item strictly into the requested slot. Exercises the
    // full HostContentOp("move") → moveContent path.
    const store = new VceContentStoreAdapter([
      { targetId: "hero", index: 0, content: { id: "a-top", type: "text", value: "A" } },
      { targetId: "hero", index: 1, content: { id: "z-bottom", type: "text", value: "Z" } },
    ]);
    const before = store
      .getSnapshot()
      .filter((p) => p.targetId === "hero")
      .sort((a, b) => a.index - b.index);
    expect(before.map((p) => p.contentId)).toEqual(["a-top", "z-bottom"]);

    const snap = store.apply({
      kind: "move",
      from: { targetId: "hero", index: 1, contentId: "z-bottom" },
      to: { targetId: "hero", index: 0 },
    });

    const after = snap
      .filter((p) => p.targetId === "hero")
      .sort((a, b) => a.index - b.index);
    expect(after.map((p) => p.contentId)).toEqual(["z-bottom", "a-top"]);
    // Dense, 0-based indices after reindex.
    expect(after.map((p) => p.index)).toEqual([0, 1]);
  });

  it("select is a no-op that returns a fresh snapshot", () => {
    const store = createDemoContentStore();
    const a = store.getSnapshot();
    const b = store.apply({ kind: "select", targetId: "hero" });
    expect(b).not.toBe(a); // fresh reference
    expect(b.length).toBe(a.length);
  });

  it("publish advances live; draft edits stay invisible to live until published", () => {
    const store = createDemoContentStore();
    expect(store.liveVersion()).toBe(1);
    // Edit the draft.
    const heroFirst = store.getDraft().find((p) => p.targetId === "hero")!;
    store.apply({
      kind: "edit",
      targetId: "hero",
      contentId: heroFirst.contentId,
      patch: { value: "Draft only" },
    });
    // Live still shows the original; draft shows the edit.
    const liveVal = store
      .getLive()
      .find((p) => p.contentId === heroFirst.contentId)?.content.value;
    const draftVal = store
      .getDraft()
      .find((p) => p.contentId === heroFirst.contentId)?.content.value;
    expect(draftVal).toBe("Draft only");
    expect(liveVal).not.toBe("Draft only");
    // Publish -> live advances and now reflects the edit.
    store.publish();
    expect(store.liveVersion()).toBe(2);
    const liveAfter = store
      .getLive()
      .find((p) => p.contentId === heroFirst.contentId)?.content.value;
    expect(liveAfter).toBe("Draft only");
  });

  it("materializeVersion surfaces earlier versions read-only", () => {
    const store = new VceContentStoreAdapter(SEED_CONTENT);
    const heroFirst = store.getDraft().find((p) => p.targetId === "hero")!;
    store.apply({
      kind: "edit",
      targetId: "hero",
      contentId: heroFirst.contentId,
      patch: { value: "v2 text" },
    });
    store.publish(); // now live v2 has "v2 text"
    // Version 1 (the seed) still materializes the original text.
    const v1 = store
      .materializeVersion("1")
      .find((p) => p.contentId === heroFirst.contentId);
    expect(v1?.content.value).toBe(heroFirst.content.value);
    expect(v1?.content.value).not.toBe("v2 text");
  });
});
