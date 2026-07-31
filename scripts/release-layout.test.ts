import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const deployScript = readFileSync(resolve("scripts/deploy-release.sh"), "utf8");
const cleanupScript = readFileSync(
  resolve("scripts/cleanup-server.sh"),
  "utf8",
);

describe("production release layout", () => {
  it("copies the standalone runtime without retaining the staging checkout", () => {
    expect(deployScript).toContain(
      'cp -a "$staging_dir/.next/standalone" "$release_dir/.next/standalone"',
    );
    expect(deployScript).toContain('"$release_dir/ops/mysql/backup.sh"');
    expect(deployScript).not.toContain(
      'cp -a "$staging_dir/." "$release_dir/"',
    );
    expect(deployScript).not.toContain('"$NPM_BIN" prune --omit=dev');
  });

  it("links a release-specific writable cache into the immutable runtime", () => {
    expect(deployScript).toContain(
      'next_cache_dir="$SHARED_DIR/next-cache/$release_id"',
    );
    expect(deployScript).toContain(
      'ln -s "$next_cache_dir" "$release_dir/.next/standalone/.next/cache"',
    );
  });

  it("cleans reproducible checkout dependencies and retired release caches", () => {
    expect(cleanupScript).toContain('"$APP_ROOT/node_modules"');
    expect(cleanupScript).toContain(
      'show_candidate "$NEXT_CACHE_DIR/$release_name"',
    );
  });
});
