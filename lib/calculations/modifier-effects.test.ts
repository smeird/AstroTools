import { describe, expect, it } from "vitest";

import { calculateModifierEffects } from "./modifier-effects";

describe("focal reducer and Barlow effects", () => {
  it("shows the expected direction of a reducer", () => {
    const result = calculateModifierEffects({
      nativeFocalLengthMm: 1000,
      apertureMm: 200,
      modifierFactor: 0.7,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      binningFactor: 1,
    });

    expect(result.modified.focalLengthMm).toBeCloseTo(700, 12);
    expect(result.modified.focalRatio).toBeCloseTo(3.5, 12);
    expect(result.modified.fieldOfViewDeg.horizontalDeg).toBeGreaterThan(
      result.native.fieldOfViewDeg.horizontalDeg,
    );
    expect(result.modified.imageScaleArcsecPerPixel).toBeGreaterThan(
      result.native.imageScaleArcsecPerPixel,
    );
    expect(result.focalLengthChangePercent).toBeCloseTo(-30, 12);
  });

  it("shows the opposite direction of a Barlow", () => {
    const result = calculateModifierEffects({
      nativeFocalLengthMm: 800,
      apertureMm: 100,
      modifierFactor: 2,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      binningFactor: 1,
    });

    expect(result.modified.focalLengthMm).toBe(1600);
    expect(result.modified.focalRatio).toBe(16);
    expect(result.modified.fieldOfViewDeg.horizontalDeg).toBeLessThan(
      result.native.fieldOfViewDeg.horizontalDeg,
    );
    expect(result.imageScaleChangePercent).toBeCloseTo(-50, 12);
  });
});
