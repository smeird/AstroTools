import { describe, expect, it } from "vitest";

import {
  CalculationInputError,
  MILLIMETRES_PER_INCH,
  calculateExactFieldOfView,
  inchesToMillimetres,
  millimetresToInches,
} from "./index";

describe("millimetre and inch display conversion", () => {
  it("uses the exact international inch definition", () => {
    expect(MILLIMETRES_PER_INCH).toBe(25.4);
    expect(millimetresToInches(25.4)).toBe(1);
    expect(inchesToMillimetres(1)).toBe(25.4);
  });

  it.each([0, 1, 24.01888, 36.00576, 1400, -25.4])(
    "round-trips %s mm without presentation rounding",
    (millimetres) => {
      expect(inchesToMillimetres(millimetresToInches(millimetres))).toBeCloseTo(
        millimetres,
        12,
      );
    },
  );

  it("leaves angular results invariant after a display-unit round trip", () => {
    const canonical = {
      effectiveFocalLengthMm: 1400,
      sensorWidthMm: 36.00576,
      sensorHeightMm: 24.01888,
    };
    const canonicalField = calculateExactFieldOfView(canonical);
    const roundTrippedField = calculateExactFieldOfView({
      effectiveFocalLengthMm: inchesToMillimetres(
        millimetresToInches(canonical.effectiveFocalLengthMm),
      ),
      sensorWidthMm: inchesToMillimetres(
        millimetresToInches(canonical.sensorWidthMm),
      ),
      sensorHeightMm: inchesToMillimetres(
        millimetresToInches(canonical.sensorHeightMm),
      ),
    });

    expect(roundTrippedField.horizontalDeg).toBeCloseTo(
      canonicalField.horizontalDeg,
      12,
    );
    expect(roundTrippedField.verticalDeg).toBeCloseTo(
      canonicalField.verticalDeg,
      12,
    );
    expect(roundTrippedField.diagonalDeg).toBeCloseTo(
      canonicalField.diagonalDeg,
      12,
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite display value %s",
    (value) => {
      expect(() => millimetresToInches(value)).toThrow(CalculationInputError);
      expect(() => inchesToMillimetres(value)).toThrow(CalculationInputError);
    },
  );

  it("rejects conversion overflow and underflow", () => {
    expect(() => inchesToMillimetres(Number.MAX_VALUE)).toThrow(
      CalculationInputError,
    );
    expect(() => millimetresToInches(Number.MIN_VALUE)).toThrow(
      CalculationInputError,
    );
  });
});
