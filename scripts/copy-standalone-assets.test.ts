import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("standalone asset copy", () => {
  it("supports an isolated verified Next output directory", async () => {
    const source = await readFile("scripts/copy-standalone-assets.mjs", "utf8");
    expect(source).toContain("ASTROTOOLS_NEXT_DIST_DIR");
    expect(source).toContain('resolve(distDir, "standalone/public")');
    expect(source).toContain('resolve(distDir, "static")');
  });
});
