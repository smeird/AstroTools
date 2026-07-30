import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./logger";

describe("structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes only defined safe context fields as JSON", () => {
    const write = vi.spyOn(console, "info").mockImplementation(() => undefined);

    log("info", {
      event: "request_complete",
      route: "/api/health/live",
      status: 200,
      durationMs: 8,
    });

    expect(write).toHaveBeenCalledWith(
      JSON.stringify({
        event: "request_complete",
        route: "/api/health/live",
        status: 200,
        durationMs: 8,
      }),
    );
  });
});
