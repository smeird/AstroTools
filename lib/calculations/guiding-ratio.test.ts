import { describe, expect, it } from "vitest";

import { calculateGuidingRatio } from "./guiding-ratio";

describe("calculateGuidingRatio", () => {
  it("compares guide and imaging image scales", () => {
    const result = calculateGuidingRatio({
      imagingFocalLengthMm: 1000,
      imagingPixelSizeUm: 3.76,
      imagingBinning: 1,
      guideFocalLengthMm: 240,
      guidePixelSizeUm: 3.75,
      guideBinning: 1,
    });

    expect(result.imagingScaleArcsecPerPixel).toBeCloseTo(0.7756, 4);
    expect(result.guideScaleArcsecPerPixel).toBeCloseTo(3.2229, 4);
    expect(result.guideToImagingRatio).toBeCloseTo(4.1556, 4);
    expect(result.guideCentroidPixelsForHalfImagingPixel).toBeCloseTo(
      0.1203,
      4,
    );
  });

  it("rejects invalid dimensions through the image-scale boundary", () => {
    expect(() =>
      calculateGuidingRatio({
        imagingFocalLengthMm: 0,
        imagingPixelSizeUm: 3.76,
        imagingBinning: 1,
        guideFocalLengthMm: 240,
        guidePixelSizeUm: 3.75,
        guideBinning: 1,
      }),
    ).toThrow();
  });
});
