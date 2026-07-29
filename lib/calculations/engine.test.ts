import { describe, expect, expectTypeOf, it } from "vitest";

import {
  CalculationInputError,
  IMAGE_SCALE_ARCSECONDS_CONSTANT,
  SAMPLING_THRESHOLDS,
  assessSampling,
  calculateEffectiveFocalLength,
  calculateEffectiveFocalRatio,
  calculateEffectivePixelSize,
  calculateExactFieldOfView,
  calculateImageScale,
  calculateImagingSystem,
  calculatePixelsPerSeeingFwhm,
  deriveSensorDimensions,
  resolveSensorDimensions,
} from "./index";
import type {
  EffectiveFocalLengthInput,
  ImagingSystemInput,
  SamplingAssessment,
} from "./index";

// Frozen expected values were evaluated independently with bc -l at scale=100.
// The implementation under test is never used to derive a golden expectation.
const GOLDEN_SYSTEM_INPUT = {
  nativeFocalLengthMm: 1000,
  apertureMm: 200,
  opticalMultipliers: [0.7, 2],
  sensor: {
    geometry: {
      source: "pixel-resolution",
      resolutionWidthPx: 9576,
      resolutionHeightPx: 6388,
    },
    nativePixelSizeUm: 3.76,
  },
  binningFactor: 2,
  seeingFwhmArcsec: 2.4,
} as const satisfies ImagingSystemInput;

const EFFECTIVE_FOCAL_LENGTH_CASES: readonly {
  label: string;
  input: EffectiveFocalLengthInput;
  expected: number;
}[] = [
  {
    label: "no modifiers",
    input: { nativeFocalLengthMm: 1000 },
    expected: 1000,
  },
  {
    label: "an empty modifier chain",
    input: { nativeFocalLengthMm: 1000, opticalMultipliers: [] },
    expected: 1000,
  },
  {
    label: "a reducer",
    input: { nativeFocalLengthMm: 1000, opticalMultipliers: [0.7] },
    expected: 700,
  },
  {
    label: "a reducer and Barlow",
    input: { nativeFocalLengthMm: 1000, opticalMultipliers: [0.7, 2] },
    expected: 1400,
  },
];

describe("effective optics", () => {
  it.each(EFFECTIVE_FOCAL_LENGTH_CASES)(
    "calculates $label",
    ({ input, expected }) => {
      expect(calculateEffectiveFocalLength(input)).toBe(expected);
    },
  );

  it("is independent of modifier order and does not mutate the chain", () => {
    const forward = Object.freeze([0.7, 2]);
    const reverse = Object.freeze([2, 0.7]);

    expect(
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: 1000,
        opticalMultipliers: forward,
      }),
    ).toBe(
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: 1000,
        opticalMultipliers: reverse,
      }),
    );
    expect(forward).toEqual([0.7, 2]);
  });

  it("keeps cancelling modifier chains order-independent at the numeric limit", () => {
    expect(
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: Number.MAX_VALUE,
        opticalMultipliers: [2, 0.5],
      }),
    ).toBe(Number.MAX_VALUE);
    expect(
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: Number.MAX_VALUE,
        opticalMultipliers: [0.5, 2],
      }),
    ).toBe(Number.MAX_VALUE);
  });

  it("calculates the focal ratio from effective focal length and aperture", () => {
    expect(
      calculateEffectiveFocalRatio({
        effectiveFocalLengthMm: 1400,
        apertureMm: 200,
      }),
    ).toBe(7);
  });
});

describe("sensor geometry", () => {
  it("derives physical dimensions from resolution and native pixel pitch", () => {
    const dimensions = deriveSensorDimensions({
      resolutionWidthPx: 9576,
      resolutionHeightPx: 6388,
      nativePixelSizeUm: 3.76,
    });

    expect(dimensions.widthMm).toBeCloseTo(36.00576, 12);
    expect(dimensions.heightMm).toBeCloseTo(24.01888, 12);
    expect(dimensions.diagonalMm).toBeCloseTo(43.28188246405186, 12);
  });

  it("uses supplied physical dimensions without deriving replacements", () => {
    expect(
      resolveSensorDimensions({
        geometry: {
          source: "physical-dimensions",
          widthMm: 36,
          heightMm: 24,
        },
        nativePixelSizeUm: 3.76,
      }),
    ).toEqual({ widthMm: 36, heightMm: 24, diagonalMm: Math.hypot(36, 24) });
  });

  it("avoids multiplication overflow when the final derived size is representable", () => {
    const nativePixelSizeUm = Number.MAX_VALUE / 2;
    const dimensions = deriveSensorDimensions({
      resolutionWidthPx: 1000,
      resolutionHeightPx: 1,
      nativePixelSizeUm,
    });

    expect(dimensions.widthMm).toBe(nativePixelSizeUm);
    expect(dimensions.heightMm / (nativePixelSizeUm / 1000)).toBeCloseTo(1, 12);
    expect(Number.isFinite(dimensions.diagonalMm)).toBe(true);
  });
});

describe("exact field of view", () => {
  it("matches the independently evaluated golden field", () => {
    const field = calculateExactFieldOfView({
      effectiveFocalLengthMm: 1400,
      sensorWidthMm: 36.00576,
      sensorHeightMm: 24.01888,
    });

    expect(field.horizontalDeg).toBeCloseTo(1.4734745619714894, 12);
    expect(field.verticalDeg).toBeCloseTo(0.9829619276407692, 12);
    expect(field.diagonalDeg).toBeCloseTo(1.7711940758722825, 12);
  });

  it("uses arctangent rather than the small-angle approximation", () => {
    const field = calculateExactFieldOfView({
      effectiveFocalLengthMm: 10,
      sensorWidthMm: 20,
      sensorHeightMm: 10,
    });
    const horizontalSmallAngleApproximationDeg = (20 / 10) * (180 / Math.PI);

    expect(field.horizontalDeg).toBeCloseTo(90, 12);
    expect(
      horizontalSmallAngleApproximationDeg - field.horizontalDeg,
    ).toBeGreaterThan(20);
  });

  it("keeps representable very wide and very narrow fields finite", () => {
    const wide = calculateExactFieldOfView({
      effectiveFocalLengthMm: 0.001,
      sensorWidthMm: 1_000_000,
      sensorHeightMm: 500_000,
    });
    const narrow = calculateExactFieldOfView({
      effectiveFocalLengthMm: 1_000_000_000,
      sensorWidthMm: 0.001,
      sensorHeightMm: 0.0005,
    });

    for (const value of [...Object.values(wide), ...Object.values(narrow)]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(180);
    }
  });
});

describe("image sampling", () => {
  it("uses the specified image-scale constant", () => {
    expect(IMAGE_SCALE_ARCSECONDS_CONSTANT).toBe(206.265);
  });

  it("avoids multiplication overflow when the final image scale is representable", () => {
    expect(
      calculateImageScale({
        effectivePixelSizeUm: Number.MAX_VALUE,
        effectiveFocalLengthMm: Number.MAX_VALUE,
      }),
    ).toBeCloseTo(206.265, 12);
  });

  it.each([
    {
      binningFactor: 1,
      effectivePixelSizeUm: 3.76,
      imageScaleArcsecPerPixel: 0.5539688571428571,
      pixelsPerSeeingFwhm: 4.332373506298188,
      assessment: "likely-oversampled",
    },
    {
      binningFactor: 2,
      effectivePixelSizeUm: 7.52,
      imageScaleArcsecPerPixel: 1.1079377142857143,
      pixelsPerSeeingFwhm: 2.166186753149094,
      assessment: "broadly-appropriate",
    },
    {
      binningFactor: 3,
      effectivePixelSizeUm: 11.28,
      imageScaleArcsecPerPixel: 1.6619065714285714,
      pixelsPerSeeingFwhm: 1.444124502099396,
      assessment: "likely-undersampled",
    },
  ] as const)(
    "matches the bin $binningFactor golden case",
    ({
      binningFactor,
      effectivePixelSizeUm: expectedPixelSize,
      imageScaleArcsecPerPixel: expectedScale,
      pixelsPerSeeingFwhm: expectedPixels,
      assessment,
    }) => {
      const effectivePixelSizeUm = calculateEffectivePixelSize({
        nativePixelSizeUm: 3.76,
        binningFactor,
      });
      const imageScaleArcsecPerPixel = calculateImageScale({
        effectivePixelSizeUm,
        effectiveFocalLengthMm: 1400,
      });
      const pixelsPerSeeingFwhm = calculatePixelsPerSeeingFwhm({
        seeingFwhmArcsec: 2.4,
        imageScaleArcsecPerPixel,
      });

      expect(effectivePixelSizeUm).toBeCloseTo(expectedPixelSize, 12);
      expect(imageScaleArcsecPerPixel).toBeCloseTo(expectedScale, 12);
      expect(pixelsPerSeeingFwhm).toBeCloseTo(expectedPixels, 12);
      expect(assessSampling(pixelsPerSeeingFwhm)).toBe(assessment);
    },
  );

  it.each([
    [1.999999999999, "likely-undersampled"],
    [2, "broadly-appropriate"],
    [3, "broadly-appropriate"],
    [4, "broadly-appropriate"],
    [4.000000000001, "likely-oversampled"],
  ] as const)("classifies %s pixels per FWHM as %s", (pixels, expected) => {
    expect(assessSampling(pixels)).toBe(expected);
  });

  it("exports the central inclusive assessment thresholds", () => {
    expect(SAMPLING_THRESHOLDS).toEqual({
      appropriateMinimumPixelsPerFwhm: 2,
      appropriateMaximumPixelsPerFwhm: 4,
    });
    expect(Object.isFrozen(SAMPLING_THRESHOLDS)).toBe(true);
  });
});

describe("composed imaging-system result", () => {
  it("matches every independent golden output without rounding", () => {
    const result = calculateImagingSystem(GOLDEN_SYSTEM_INPUT);

    expect(result.effectiveFocalLengthMm).toBe(1400);
    expect(result.effectiveFocalRatio).toBe(7);
    expect(result.sensorDimensionsMm.widthMm).toBeCloseTo(36.00576, 12);
    expect(result.sensorDimensionsMm.heightMm).toBeCloseTo(24.01888, 12);
    expect(result.sensorDimensionsMm.diagonalMm).toBeCloseTo(
      43.28188246405186,
      12,
    );
    expect(result.fieldOfViewDeg.horizontalDeg).toBeCloseTo(
      1.4734745619714894,
      12,
    );
    expect(result.fieldOfViewDeg.verticalDeg).toBeCloseTo(
      0.9829619276407692,
      12,
    );
    expect(result.fieldOfViewDeg.diagonalDeg).toBeCloseTo(
      1.7711940758722825,
      12,
    );
    expect(result.effectivePixelSizeUm).toBeCloseTo(7.52, 12);
    expect(result.imageScaleArcsecPerPixel).toBeCloseTo(1.1079377142857143, 12);
    expect(result.pixelsPerSeeingFwhm).toBeCloseTo(2.166186753149094, 12);
    expect(result.samplingAssessment).toBe("broadly-appropriate");
  });

  it("does not let aperture independently alter field of view", () => {
    const baseline = calculateImagingSystem(GOLDEN_SYSTEM_INPUT);
    const smallerAperture = calculateImagingSystem({
      ...GOLDEN_SYSTEM_INPUT,
      apertureMm: 100,
    });

    expect(smallerAperture.fieldOfViewDeg).toEqual(baseline.fieldOfViewDeg);
    expect(smallerAperture.effectiveFocalLengthMm).toBe(
      baseline.effectiveFocalLengthMm,
    );
    expect(smallerAperture.effectiveFocalRatio).toBe(
      baseline.effectiveFocalRatio * 2,
    );
  });

  it("does not let binning alter field of view", () => {
    const binOne = calculateImagingSystem({
      ...GOLDEN_SYSTEM_INPUT,
      binningFactor: 1,
    });
    const binTwo = calculateImagingSystem(GOLDEN_SYSTEM_INPUT);

    expect(binTwo.fieldOfViewDeg).toEqual(binOne.fieldOfViewDeg);
    expect(binTwo.imageScaleArcsecPerPixel).toBeCloseTo(
      binOne.imageScaleArcsecPerPixel * 2,
      12,
    );
    expect(binTwo.pixelsPerSeeingFwhm).toBeCloseTo(
      binOne.pixelsPerSeeingFwhm / 2,
      12,
    );
  });

  it("is deterministic and leaves a frozen input unchanged", () => {
    const modifiers = Object.freeze([0.7, 2] as const);
    const input = Object.freeze({
      ...GOLDEN_SYSTEM_INPUT,
      opticalMultipliers: modifiers,
    });

    expect(calculateImagingSystem(input)).toEqual(
      calculateImagingSystem(input),
    );
    expect(modifiers).toEqual([0.7, 2]);
  });

  it("exposes a closed assessment result type", () => {
    expectTypeOf<SamplingAssessment>().toEqualTypeOf<
      "likely-undersampled" | "broadly-appropriate" | "likely-oversampled"
    >();
  });
});

describe("known equipment example", () => {
  it("matches an EVOSTAR 80EDX and ASI2600 golden calculation", () => {
    const result = calculateImagingSystem({
      nativeFocalLengthMm: 600,
      apertureMm: 80,
      sensor: {
        geometry: {
          source: "pixel-resolution",
          resolutionWidthPx: 6248,
          resolutionHeightPx: 4176,
        },
        nativePixelSizeUm: 3.76,
      },
      binningFactor: 1,
      seeingFwhmArcsec: 2,
    });

    expect(result.effectiveFocalLengthMm).toBe(600);
    expect(result.effectiveFocalRatio).toBe(7.5);
    expect(result.sensorDimensionsMm.widthMm).toBeCloseTo(23.49248, 12);
    expect(result.sensorDimensionsMm.heightMm).toBeCloseTo(15.70176, 12);
    expect(result.sensorDimensionsMm.diagonalMm).toBeCloseTo(
      28.25671395700498,
      12,
    );
    expect(result.fieldOfViewDeg.horizontalDeg).toBeCloseTo(
      2.243080057668941,
      12,
    );
    expect(result.fieldOfViewDeg.verticalDeg).toBeCloseTo(
      1.499322068146416,
      12,
    );
    expect(result.fieldOfViewDeg.diagonalDeg).toBeCloseTo(
      2.6978188717281433,
      12,
    );
    expect(result.imageScaleArcsecPerPixel).toBeCloseTo(1.292594, 12);
    expect(result.pixelsPerSeeingFwhm).toBeCloseTo(1.5472762522493528, 12);
    expect(result.samplingAssessment).toBe("likely-undersampled");
  });
});

describe("invalid and unrepresentable inputs", () => {
  it.each([
    0,
    -0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects invalid native focal length %s", (nativeFocalLengthMm) => {
    expect(() =>
      calculateEffectiveFocalLength({ nativeFocalLengthMm }),
    ).toThrow(CalculationInputError);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid optical multiplier %s",
    (multiplier) => {
      expect(() =>
        calculateEffectiveFocalLength({
          nativeFocalLengthMm: 1000,
          opticalMultipliers: [multiplier],
        }),
      ).toThrow(CalculationInputError);
    },
  );

  it("rejects a sparse modifier chain", () => {
    const sparseMultipliers = new Array<number>(1);

    expect(() =>
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: 1000,
        opticalMultipliers: sparseMultipliers,
      }),
    ).toThrow(CalculationInputError);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid pixel count %s",
    (resolutionWidthPx) => {
      expect(() =>
        deriveSensorDimensions({
          resolutionWidthPx,
          resolutionHeightPx: 100,
          nativePixelSizeUm: 3.76,
        }),
      ).toThrow(CalculationInputError);
    },
  );

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid binning factor %s",
    (binningFactor) => {
      expect(() =>
        calculateEffectivePixelSize({ nativePixelSizeUm: 3.76, binningFactor }),
      ).toThrow(CalculationInputError);
    },
  );

  it("identifies the failing parameter without exposing framework errors", () => {
    expect.assertions(3);

    try {
      calculateExactFieldOfView({
        effectiveFocalLengthMm: 1000,
        sensorWidthMm: 0,
        sensorHeightMm: 24,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CalculationInputError);
      expect(error).toHaveProperty("parameter", "sensorWidthMm");
      expect(error).toHaveProperty("name", "CalculationInputError");
    }
  });

  it.each([
    () =>
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: Number.MAX_VALUE,
        opticalMultipliers: [2],
      }),
    () =>
      calculateEffectiveFocalLength({
        nativeFocalLengthMm: Number.MIN_VALUE,
        opticalMultipliers: [0.5],
      }),
    () =>
      deriveSensorDimensions({
        resolutionWidthPx: Number.MAX_SAFE_INTEGER,
        resolutionHeightPx: 1,
        nativePixelSizeUm: Number.MAX_VALUE,
      }),
    () =>
      calculateImageScale({
        effectivePixelSizeUm: Number.MAX_VALUE,
        effectiveFocalLengthMm: Number.MIN_VALUE,
      }),
  ])("rejects intermediate overflow or underflow", (calculation) => {
    expect(calculation).toThrow(CalculationInputError);
  });
});
