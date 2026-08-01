import { describe, expect, it } from "vitest";

import {
  calculateAtmosphericExtinction,
  calculateAutofocusPlan,
  calculateCalibrationFrames,
  calculateDrizzlePlan,
  calculateFieldRotation,
  calculateFilterAllocation,
  calculateGuidingExposure,
  calculateImagingWindow,
  calculateIntegrationPlan,
  calculateOptimalSubExposure,
  calculatePlateSolvingScale,
  calculateStarSaturation,
} from "./advanced-planning";

describe("advanced planning calculations", () => {
  it("bounds an optimal sub-exposure by background and saturation", () => {
    const result = calculateOptimalSubExposure({
      readNoiseE: 1.5,
      skyRateEPerPixelS: 0.2,
      darkCurrentEPerPixelS: 0.01,
      skyNoiseMultiple: 10,
      fullWellE: 50_000,
      brightStarRateEPerS: 500,
      headroomPercent: 20,
    });
    expect(result.minimumSeconds).toBeCloseTo(107.142857, 5);
    expect(result.saturationLimitedSeconds).toBe(80);
    expect(result.constrainedBySaturation).toBe(true);
  });

  it("allows rejected frames in an integration plan", () => {
    const result = calculateIntegrationPlan({
      totalHours: 2,
      subExposureSeconds: 120,
      rejectionPercent: 10,
      currentIntegrationHours: 1,
    });
    expect(result.acceptedFrames).toBe(60);
    expect(result.captureFrames).toBe(67);
    expect(result.relativeSnrGain).toBeCloseTo(Math.sqrt(2));
  });

  it("allocates more time to a lower-transmission filter", () => {
    const result = calculateFilterAllocation({
      totalHours: 6,
      channel1Weight: 1,
      channel2Weight: 1,
      channel3Weight: 1,
      channel1TransmissionPercent: 100,
      channel2TransmissionPercent: 50,
      channel3TransmissionPercent: 100,
      subExposureSeconds: 300,
    });
    expect(result.channelHours).toEqual([1.5, 3, 1.5]);
  });

  it("predicts star saturation", () => {
    const result = calculateStarSaturation({
      fullWellE: 40_000,
      gainEPerAdu: 0.5,
      sourceRateEPerS: 200,
      headroomPercent: 20,
      exposureSeconds: 180,
    });
    expect(result.saturationSeconds).toBe(160);
    expect(result.saturated).toBe(true);
  });

  it("solves the guide-star SNR exposure and motion ceiling", () => {
    const result = calculateGuidingExposure({
      guideStarRateEPerS: 500,
      skyRateEPerS: 20,
      readNoiseE: 2,
      targetSnr: 20,
      mountErrorArcsecPerS: 0.5,
      allowedMotionArcsec: 1,
    });
    expect(result.minimumSeconds).toBeGreaterThan(0);
    expect(result.motionLimitedSeconds).toBe(2);
  });

  it("calculates plate-solving scale and field", () => {
    const result = calculatePlateSolvingScale({
      focalLengthMm: 500,
      pixelSizeUm: 3.76,
      widthPx: 6248,
      heightPx: 4176,
      scaleTolerancePercent: 10,
    });
    expect(result.imageScaleArcsecPerPx).toBeCloseTo(1.5511, 3);
    expect(result.searchScaleMin).toBeLessThan(result.imageScaleArcsecPerPx);
  });

  it("intersects an altitude window with darkness", () => {
    const result = calculateImagingWindow({
      latitudeDeg: 52,
      declinationDeg: 30,
      minimumAltitudeDeg: 30,
      darknessHours: 8,
      exposureMinutes: 5,
    });
    expect(result.usableHours).toBeLessThanOrEqual(8);
    expect(result.possibleExposures).toBeGreaterThan(0);
  });

  it("increases extinction toward the horizon", () => {
    const high = calculateAtmosphericExtinction({
      altitudeDeg: 80,
      extinctionMagPerAirmass: 0.2,
      seaLevelPressureHpa: 1013.25,
      sitePressureHpa: 1013.25,
    });
    const low = calculateAtmosphericExtinction({
      altitudeDeg: 20,
      extinctionMagPerAirmass: 0.2,
      seaLevelPressureHpa: 1013.25,
      sitePressureHpa: 1013.25,
    });
    expect(low.extinctionMag).toBeGreaterThan(high.extinctionMag);
  });

  it("plans calibration noise and storage", () => {
    const result = calculateCalibrationFrames({
      lightFrames: 100,
      darkFrames: 25,
      flatFrames: 25,
      biasFrames: 25,
      frameSizeMb: 50,
      targetMasterNoisePercent: 20,
    });
    expect(result.recommendedFramesPerMaster).toBe(25);
    expect(result.totalCalibrationFrames).toBe(75);
  });

  it("expands drizzle dimensions quadratically", () => {
    const result = calculateDrizzlePlan({
      widthPx: 3000,
      heightPx: 2000,
      drizzleFactor: 2,
      frameCount: 40,
      ditherPositions: 4,
      bytesPerPixel: 4,
    });
    expect(result.outputWidthPx).toBe(6000);
    expect(result.outputMegapixels).toBe(24);
    expect(result.adequatelySampled).toBe(true);
  });

  it("turns field rotation into an exposure ceiling", () => {
    const result = calculateFieldRotation({
      rotationRateDegPerHour: 10,
      fieldRadiusDeg: 1,
      imageScaleArcsecPerPx: 1.5,
      allowedTrailPx: 1,
      proposedExposureSeconds: 30,
    });
    expect(result.maximumExposureSeconds).toBeGreaterThan(0);
    expect(result.predictedTrailPx).toBeGreaterThan(0);
  });

  it("derives a critical focus zone and sweep", () => {
    const result = calculateAutofocusPlan({
      focalRatio: 5,
      wavelengthNm: 550,
      focuserMicronsPerStep: 1,
      samples: 9,
      temperatureChangeC: 4,
      expansionUmPerC: 5,
    });
    expect(result.criticalFocusZoneUm).toBeCloseTo(30.25);
    expect(result.sweepSteps).toBeGreaterThan(0);
  });

  it("rejects physically invalid inputs", () => {
    expect(() =>
      calculateAtmosphericExtinction({
        altitudeDeg: 0,
        extinctionMagPerAirmass: 0.2,
        seaLevelPressureHpa: 1013,
        sitePressureHpa: 900,
      }),
    ).toThrow();
  });
});
