import { describe, expect, it } from "vitest";
import { calculateExposureSnr } from "./exposure-snr";

describe("calculateExposureSnr", () => {
  it("combines shot, dark and per-frame read noise for a stack", () => {
    const result = calculateExposureSnr({
      effectiveFocalLengthMm: 700,
      pixelSizeUm: 4,
      binningFactor: 1,
      sourceRateElectronsPerSecPerArcsec2: 0.5,
      skyRateElectronsPerSecPerArcsec2: 1,
      darkCurrentElectronsPerSecPerPixel: 0.01,
      readNoiseElectrons: 2,
      subExposureSeconds: 120,
      frameCount: 30,
    });
    expect(result.imageScaleArcsecPerPixel).toBeCloseTo(1.1787, 4);
    expect(result.totalIntegrationSeconds).toBe(3600);
    expect(result.snr).toBeCloseTo(28.5755, 4);
    expect(result.snr / result.singleFrameSnr).toBeCloseTo(Math.sqrt(30), 10);
  });

  it("requires a positive whole frame count", () => {
    expect(() =>
      calculateExposureSnr({
        effectiveFocalLengthMm: 700,
        pixelSizeUm: 4,
        binningFactor: 1,
        sourceRateElectronsPerSecPerArcsec2: 0.5,
        skyRateElectronsPerSecPerArcsec2: 1,
        darkCurrentElectronsPerSecPerPixel: 0,
        readNoiseElectrons: 2,
        subExposureSeconds: 120,
        frameCount: 1.5,
      }),
    ).toThrow();
  });
});
