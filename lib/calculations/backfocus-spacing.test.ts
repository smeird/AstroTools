import { describe, expect, it } from "vitest";

import { calculateBackfocusSpacing } from "./backfocus-spacing";

describe("back-focus spacing", () => {
  it("adds the first-order filter allowance to the nominal target", () => {
    const result = calculateBackfocusSpacing({
      nominalBackfocusMm: 55,
      cameraDepthMm: 17.5,
      filterWheelDepthMm: 20,
      guiderDepthMm: 0,
      otherAdaptersMm: 5,
      installedSpacerMm: 13,
      filterThicknessMm: 2,
      filterRefractiveIndex: 1.5,
    });

    expect(result.filterFocusAllowanceMm).toBeCloseTo(2 / 3, 12);
    expect(result.correctedTargetMm).toBeCloseTo(55 + 2 / 3, 12);
    expect(result.fixedTrainLengthMm).toBe(42.5);
    expect(result.requiredSpacerMm).toBeCloseTo(13 + 1 / 6, 12);
    expect(result.status).toBe("short");
    expect(result.adjustmentMm).toBeCloseTo(1 / 6, 12);
  });

  it("classifies errors within 0.1 mm as within tolerance", () => {
    const result = calculateBackfocusSpacing({
      nominalBackfocusMm: 55,
      cameraDepthMm: 17.5,
      filterWheelDepthMm: 20,
      guiderDepthMm: 0,
      otherAdaptersMm: 4.5,
      installedSpacerMm: 13.05,
      filterThicknessMm: 0,
      filterRefractiveIndex: 1.5,
    });
    expect(result.spacingErrorMm).toBeCloseTo(0.05, 12);
    expect(result.status).toBe("within-tolerance");
  });

  it("rejects invalid optical inputs", () => {
    expect(() =>
      calculateBackfocusSpacing({
        nominalBackfocusMm: 55,
        cameraDepthMm: -1,
        filterWheelDepthMm: 20,
        guiderDepthMm: 0,
        otherAdaptersMm: 0,
        installedSpacerMm: 0,
        filterThicknessMm: 0,
        filterRefractiveIndex: 1.5,
      }),
    ).toThrow("cameraDepthMm");
  });
});
