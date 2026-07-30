import { describe, expect, it, vi } from "vitest";

import { runReadinessProbe } from "./readiness";

describe("runReadinessProbe", () => {
  it("resolves after a successful bounded database query", async () => {
    const query = vi.fn().mockResolvedValue([{ result: 1 }]);

    await expect(runReadinessProbe(query, 100)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledOnce();
  });

  it("rejects a failed query without transforming its details for logging", async () => {
    const query = vi.fn().mockRejectedValue(new Error("private SQL detail"));

    await expect(runReadinessProbe(query, 100)).rejects.toThrow(
      "private SQL detail",
    );
  });

  it("bounds a stalled query", async () => {
    vi.useFakeTimers();

    try {
      const result = runReadinessProbe(() => new Promise(() => undefined), 100);
      const rejection = expect(result).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(100);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
