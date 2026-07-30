import { describe, expect, it } from "vitest";

import {
  convertMillimetresForDisplay,
  formatArcminutes,
  formatDecimal,
  formatDegrees,
  formatRoundTripNumber,
  imageScaleFocalLengthDenominator,
  physicalUnitDefinition,
  presentPhysicalLength,
} from "./calculation-presentation";

describe("calculation presentation", () => {
  it.each([
    {
      value: 1.23456,
      options: { maximumFractionDigits: 3 },
      expected: "1.235",
    },
    {
      value: 1.2,
      options: { minimumFractionDigits: 2, maximumFractionDigits: 4 },
      expected: "1.20",
    },
    {
      value: -0,
      options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      expected: "0.00",
    },
    {
      value: -0.000_001,
      options: { maximumFractionDigits: 4 },
      expected: "0",
    },
  ])("formats $value as $expected", ({ value, options, expected }) => {
    expect(formatDecimal(value, options)).toBe(expected);
  });

  it("rejects non-finite values and incoherent precision", () => {
    expect(() => formatDecimal(Number.NaN)).toThrow(TypeError);
    expect(() =>
      formatDecimal(1, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 2,
      }),
    ).toThrow(RangeError);
  });

  it("preserves boundary-adjacent values in classification inequalities", () => {
    const immediatelyBelowTwo = 2 - Number.EPSILON;
    const immediatelyAboveFour = 4 + Number.EPSILON * 4;

    expect(formatRoundTripNumber(immediatelyBelowTwo)).toBe(
      "1.9999999999999998",
    );
    expect(Number(formatRoundTripNumber(immediatelyBelowTwo))).toBe(
      immediatelyBelowTwo,
    );
    expect(formatRoundTripNumber(immediatelyAboveFour)).toBe(
      "4.000000000000001",
    );
    expect(Number(formatRoundTripNumber(immediatelyAboveFour))).toBe(
      immediatelyAboveFour,
    );
    expect(() => formatRoundTripNumber(Number.POSITIVE_INFINITY)).toThrow(
      TypeError,
    );
  });

  it("converts physical displays exactly without changing canonical values", () => {
    const canonicalMm = 25.4;

    expect(convertMillimetresForDisplay(canonicalMm, "millimetres")).toBe(
      canonicalMm,
    );
    expect(convertMillimetresForDisplay(canonicalMm, "inches")).toBe(1);
    expect(presentPhysicalLength(canonicalMm, "millimetres").text).toBe(
      "25.40 mm",
    );
    expect(presentPhysicalLength(canonicalMm, "inches").text).toBe("1.000 in");
  });

  it("uses the dimensionally correct sensor conversion for each unit", () => {
    expect(physicalUnitDefinition("millimetres")).toMatchObject({
      unitSymbol: "mm",
      micrometresPerUnit: 1_000,
    });
    expect(physicalUnitDefinition("inches")).toMatchObject({
      unitSymbol: "in",
      micrometresPerUnit: 25_400,
    });
  });

  it("retains the millimetre conversion required by the image-scale constant", () => {
    expect(imageScaleFocalLengthDenominator(600, "millimetres")).toMatchObject({
      displayedFocalLength: { value: 600, unitSymbol: "mm" },
      millimetresPerDisplayedUnit: 1,
    });
    expect(imageScaleFocalLengthDenominator(600, "inches")).toMatchObject({
      displayedFocalLength: {
        value: 600 / 25.4,
        unitSymbol: "in",
      },
      millimetresPerDisplayedUnit: 25.4,
    });
  });

  it("keeps degrees and arcminutes in consistent principal pairs", () => {
    expect(formatDegrees(1.345)).toBe("1.34°");
    expect(formatArcminutes(1.345)).toBe("80.7′");
  });
});
