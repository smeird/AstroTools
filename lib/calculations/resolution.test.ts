import { describe, expect, it } from "vitest";

import {
  calculateResolutionAndSampling,
  classifyResolutionSampling,
} from "./resolution";

describe("resolution and sampling", () => {
  it("calculates diffraction limits and detector sampling", () => {
    const result = calculateResolutionAndSampling({
      apertureMm: 200,
      wavelengthNm: 550,
      focalLengthMm: 1000,
      pixelSizeUm: 3.76,
      binningFactor: 1,
      seeingFwhmArcsec: 2,
    });

    expect(result.rayleighLimitArcsec).toBeCloseTo(0.692, 3);
    expect(result.dawesLimitArcsec).toBeCloseTo(0.58, 3);
    expect(result.imageScaleArcsecPerPixel).toBeCloseTo(0.776, 3);
    expect(result.pixelsPerRayleighLimit).toBeCloseTo(0.892, 3);
    expect(result.pixelsPerSeeingFwhm).toBeCloseTo(2.579, 3);
    expect(result.criticalFocalLengthMm).toBeCloseTo(2241.4, 1);
    expect(result.criticalFocalRatio).toBeCloseTo(11.207, 3);
    expect(classifyResolutionSampling(result.pixelsPerRayleighLimit)).toBe(
      "undersampled",
    );
  });

  it("scales the critical focal length with pixel size and aperture", () => {
    const one = calculateResolutionAndSampling({
      apertureMm: 100,
      wavelengthNm: 500,
      focalLengthMm: 1000,
      pixelSizeUm: 2,
      binningFactor: 1,
      seeingFwhmArcsec: 2,
    });
    const two = calculateResolutionAndSampling({
      apertureMm: 100,
      wavelengthNm: 500,
      focalLengthMm: 1000,
      pixelSizeUm: 2,
      binningFactor: 2,
      seeingFwhmArcsec: 2,
    });

    expect(two.effectivePixelSizeUm).toBe(one.effectivePixelSizeUm * 2);
    expect(two.criticalFocalLengthMm).toBe(one.criticalFocalLengthMm * 2);
    expect(two.imageScaleArcsecPerPixel).toBe(one.imageScaleArcsecPerPixel * 2);
  });

  it.each([
    [1.99, "undersampled"],
    [2, "critically-sampled"],
    [4, "critically-sampled"],
    [4.01, "oversampled"],
  ] as const)(
    "classifies %s pixels per resolution element",
    (pixels, result) => {
      expect(classifyResolutionSampling(pixels)).toBe(result);
    },
  );
});
