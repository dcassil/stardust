/**
 * Recent-uploads registry (packaged `createUploadRegistry`, dashboard 0.1.8):
 * records uploads newest-first, dedupes by data URL, and degrades gracefully when
 * storage is empty or malformed. Re-pointed at the package after SVER-T-0035 —
 * the demo-local `uploads.ts` it used to cover is deleted.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createUploadRegistry } from "@stardust-cms/dashboard";

const KEY = "stardust-demo-uploads";
const registry = createUploadRegistry({ key: KEY, max: 20 });

describe("uploads registry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(registry.list()).toEqual([]);
  });

  it("records uploads newest-first", () => {
    registry.add("a.png", "data:image/png;base64,AAA");
    registry.add("b.png", "data:image/png;base64,BBB");
    const names = registry.list().map((u) => u.name);
    expect(names).toEqual(["b.png", "a.png"]);
  });

  it("dedupes by data URL, keeping a single newest entry", () => {
    registry.add("a.png", "data:image/png;base64,AAA");
    registry.add("a-renamed.png", "data:image/png;base64,AAA");
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("a-renamed.png");
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(KEY, "{bad");
    expect(registry.list()).toEqual([]);
  });
});
