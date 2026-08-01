import { describe, expect, it } from "vitest";

import { calculatePolarAlignmentDrift } from "./polar-alignment-drift";

describe("calculatePolarAlignmentDrift", () => {
  it("derives azimuth error near the meridian from signed pixel drift", () => {
    const result = calculatePolarAlignmentDrift({
      driftPixels: 10,
      durationMinutes: 5,
      effectiveFocalLengthMm: 1000,
      pixelSizeUm: 3.76,
      binningFactor: 1,
      latitudeDeg: 52,
      hourAngleDeg: 0,
    });
    expect(result.imageScaleArcsecPerPixel).toBeCloseTo(0.7756, 4);
    expect(result.driftRateArcsecPerMinute).toBeCloseTo(1.5511, 4);
    expect(result.azimuthErrorArcmin).toBeCloseTo(9.6235, 4);
    expect(result.altitudeErrorArcmin).toBeNull();
  });

  it("derives altitude error at a six-hour hour angle", () => {
    const result = calculatePolarAlignmentDrift({
      driftPixels: -10,
      durationMinutes: 5,
      effectiveFocalLengthMm: 1000,
      pixelSizeUm: 3.76,
      binningFactor: 1,
      latitudeDeg: 52,
      hourAngleDeg: 90,
    });
    expect(result.azimuthErrorArcmin).toBeNull();
    expect(result.altitudeErrorArcmin).toBeCloseTo(-5.9248, 4);
  });
});
