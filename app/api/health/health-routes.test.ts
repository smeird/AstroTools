import { describe, expect, it, vi } from "vitest";

import { createReadinessHandler } from "../_shared/health-handlers";
import { GET as getLiveness } from "./live/route";

describe("health routes", () => {
  const livenessRequest = new Request(
    "https://astrotools.smeird.com/api/health/live",
  );
  const readinessRequest = new Request(
    "https://astrotools.smeird.com/api/health/ready",
  );

  it("reports liveness without a database dependency", async () => {
    const response = getLiveness(livenessRequest);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      apiVersion: "v1",
      data: { status: "ok" },
    });
  });

  it("reports readiness after the database probe succeeds", async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const response = await createReadinessHandler(check)(readinessRequest);

    expect(check).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      apiVersion: "v1",
      data: { status: "ready" },
    });
  });

  it("returns a safe 503 when the database probe fails", async () => {
    const check = vi
      .fn()
      .mockRejectedValue(new Error("password and private SQL detail"));
    const response = await createReadinessHandler(check)(readinessRequest);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).not.toContain("password");
    expect(body).not.toContain("SQL");
    expect(JSON.parse(body)).toEqual({
      apiVersion: "v1",
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "The service is not ready.",
      },
    });
  });

  it("rejects health query parameters before invoking readiness", async () => {
    const check = vi.fn();
    const liveness = getLiveness(
      new Request("https://astrotools.smeird.com/api/health/live?probe=full"),
    );
    const readiness = await createReadinessHandler(check)(
      new Request("https://astrotools.smeird.com/api/health/ready?probe=full"),
    );

    expect(liveness.status).toBe(400);
    expect(readiness.status).toBe(400);
    expect(check).not.toHaveBeenCalled();
  });
});
