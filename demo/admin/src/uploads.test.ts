/**
 * Recent-uploads registry: records uploads newest-first, dedupes by data URL,
 * and degrades gracefully when storage is empty or malformed.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { addUpload, listUploads } from "./uploads";

describe("uploads registry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(listUploads()).toEqual([]);
  });

  it("records uploads newest-first", () => {
    addUpload("a.png", "data:image/png;base64,AAA");
    addUpload("b.png", "data:image/png;base64,BBB");
    const names = listUploads().map((u) => u.name);
    expect(names).toEqual(["b.png", "a.png"]);
  });

  it("dedupes by data URL, keeping a single newest entry", () => {
    addUpload("a.png", "data:image/png;base64,AAA");
    addUpload("a-renamed.png", "data:image/png;base64,AAA");
    const list = listUploads();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("a-renamed.png");
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem("stardust-demo-uploads", "{bad");
    expect(listUploads()).toEqual([]);
  });
});
