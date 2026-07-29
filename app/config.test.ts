import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("production server configuration", () => {
  it("builds a standalone artefact without the framework signature header", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
