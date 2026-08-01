import { describe, expect, it } from "vitest";
import { calculateMosaicPlanning } from "./mosaic-planning";

describe("calculateMosaicPlanning", () => {
  it("covers the target with the requested adjacent-panel overlap", () => {
    const result = calculateMosaicPlanning({
      effectiveFocalLengthMm: 700,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      targetWidthDeg: 5,
      targetHeightDeg: 3,
      overlapPercent: 15,
      hoursPerPanel: 2,
    });
    expect(result.panelWidthDeg).toBeCloseTo(1.923, 3);
    expect(result.panelHeightDeg).toBeCloseTo(1.285, 3);
    expect(result.columns).toBe(3);
    expect(result.rows).toBe(3);
    expect(result.panelCount).toBe(9);
    expect(result.achievedWidthDeg).toBeGreaterThanOrEqual(5);
    expect(result.achievedHeightDeg).toBeGreaterThanOrEqual(3);
    expect(result.totalIntegrationHours).toBe(18);
  });

  it("uses one panel when the target already fits", () => {
    const result = calculateMosaicPlanning({
      effectiveFocalLengthMm: 700,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      targetWidthDeg: 1,
      targetHeightDeg: 1,
      overlapPercent: 20,
      hoursPerPanel: 1,
    });
    expect(result.panelCount).toBe(1);
  });
});
