import { describe, expect, it } from "vitest";
import { calculateStorageVolume } from "./storage-volume";
describe("calculateStorageVolume", () => {
  it("counts complete exposures and calibration frames", () => {
    const r = calculateStorageVolume({
      resolutionWidthPx: 6248,
      resolutionHeightPx: 4176,
      bitDepth: 16,
      channelCount: 1,
      exposureSeconds: 120,
      sessionHours: 4,
      calibrationFrames: 60,
      fileOverheadPercent: 5,
    });
    expect(r.lightFrameCount).toBe(120);
    expect(r.totalFrameCount).toBe(180);
    expect(r.totalDataGiB).toBeCloseTo(9.1853, 4);
  });
});
