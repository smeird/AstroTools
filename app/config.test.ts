import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("production server configuration", () => {
  it("builds a standalone artefact without the framework signature header", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sets a CSP without unsafe eval plus baseline browser protections", async () => {
    const rules = await nextConfig.headers?.();
    const headers = rules?.[0]?.headers ?? [];

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "X-Content-Type-Options",
          value: "nosniff",
        }),
        expect.objectContaining({
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        }),
        expect.objectContaining({
          key: "Content-Security-Policy",
          value: expect.not.stringContaining("unsafe-eval"),
        }),
      ]),
    );
  });
});
