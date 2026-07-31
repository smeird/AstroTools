import { describe, expect, it } from "vitest";

import { calculateSensorTilt } from "./sensor-tilt";

describe("sensor tilt", () => {
  it("derives axis and combined plane tilt from measured focus differences", () => {
    const result = calculateSensorTilt({
      sensorWidthMm: 36,
      sensorHeightMm: 24,
      horizontalFocusDifferenceUm: 36,
      verticalFocusDifferenceUm: 24,
      adjusterSpacingMm: 50,
    });

    expect(result.horizontalTiltDeg).toBeCloseTo(0.0572958, 6);
    expect(result.verticalTiltDeg).toBeCloseTo(0.0572958, 6);
    expect(result.combinedTiltDeg).toBeCloseTo(0.0810284, 6);
    expect(result.cornerToCornerFocusDifferenceUm).toBeCloseTo(43.2666, 4);
    expect(result.correctionAtAdjusterUm).toBeCloseTo(70.7107, 4);
  });

  it("preserves axis direction while reporting a positive combined magnitude", () => {
    const result = calculateSensorTilt({
      sensorWidthMm: 20,
      sensorHeightMm: 10,
      horizontalFocusDifferenceUm: -20,
      verticalFocusDifferenceUm: 0,
      adjusterSpacingMm: 40,
    });

    expect(result.horizontalTiltDeg).toBeLessThan(0);
    expect(result.verticalTiltDeg).toBe(0);
    expect(result.combinedTiltDeg).toBeGreaterThan(0);
    expect(result.correctionAtAdjusterUm).toBeCloseTo(40, 10);
  });

  it("rejects non-physical geometry", () => {
    expect(() =>
      calculateSensorTilt({
        sensorWidthMm: 0,
        sensorHeightMm: 24,
        horizontalFocusDifferenceUm: 1,
        verticalFocusDifferenceUm: 1,
        adjusterSpacingMm: 50,
      }),
    ).toThrow("sensorWidthMm");
  });
});
