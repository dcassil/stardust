/**
 * Persistence round-trip: mutations to a persisted store survive being rebuilt
 * from `localStorage`, and an un-persisted store leaves storage untouched.
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { HostContentOp } from "@stardust-cms/dashboard";
import { VceContentStoreAdapter } from "./VceContentStoreAdapter.js";
import { loadPersistedSeed } from "./persistence.js";
import type { SeedItem } from "../content-model.js";

const SEED: readonly SeedItem[] = [
  { targetId: "hero", index: 0, content: { id: "t1", type: "text", value: "Hello" } },
];

const editOp = (contentId: string, value: string): HostContentOp => ({
  kind: "edit",
  targetId: "hero",
  contentId,
  patch: { value },
});

describe("content persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists mutations and rebuilds them from localStorage", () => {
    const store = new VceContentStoreAdapter(SEED, { persist: true });
    store.apply(editOp("t1", "Edited"));

    const persisted = loadPersistedSeed();
    expect(persisted).not.toBeNull();
    expect(persisted?.find((s) => s.content.id === "t1")?.content.value).toBe("Edited");

    // A fresh store seeded from the persisted snapshot reflects the edit.
    const reloaded = new VceContentStoreAdapter(persisted ?? SEED, { persist: true });
    const payload = reloaded.getDraft().find((p) => p.contentId === "t1");
    expect(payload?.content.value).toBe("Edited");
  });

  it("does not write to storage when persistence is disabled", () => {
    const store = new VceContentStoreAdapter(SEED); // persist defaults to false
    store.apply(editOp("t1", "Edited"));
    expect(loadPersistedSeed()).toBeNull();
  });

  it("returns null for absent or malformed stored content", () => {
    expect(loadPersistedSeed()).toBeNull();
    localStorage.setItem("stardust-demo-content", "{not valid json");
    expect(loadPersistedSeed()).toBeNull();
  });
});
