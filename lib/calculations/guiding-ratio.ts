import { calculateImageScale } from "./engine";

export interface GuidingRatioInput {
  readonly imagingFocalLengthMm: number;
  readonly imagingPixelSizeUm: number;
  readonly imagingBinning: number;
  readonly guideFocalLengthMm: number;
  readonly guidePixelSizeUm: number;
  readonly guideBinning: number;
}

export interface GuidingRatioResult {
  readonly imagingScaleArcsecPerPixel: number;
  readonly guideScaleArcsecPerPixel: number;
  readonly guideToImagingRatio: number;
  readonly guidePixelsPerImagingPixel: number;
  readonly guideCentroidPixelsForHalfImagingPixel: number;
}

export function calculateGuidingRatio(
  input: GuidingRatioInput,
): GuidingRatioResult {
  const imagingScaleArcsecPerPixel = calculateImageScale({
    effectiveFocalLengthMm: input.imagingFocalLengthMm,
    effectivePixelSizeUm: input.imagingPixelSizeUm * input.imagingBinning,
  });
  const guideScaleArcsecPerPixel = calculateImageScale({
    effectiveFocalLengthMm: input.guideFocalLengthMm,
    effectivePixelSizeUm: input.guidePixelSizeUm * input.guideBinning,
  });
  const guideToImagingRatio =
    guideScaleArcsecPerPixel / imagingScaleArcsecPerPixel;

  return {
    imagingScaleArcsecPerPixel,
    guideScaleArcsecPerPixel,
    guideToImagingRatio,
    guidePixelsPerImagingPixel: 1 / guideToImagingRatio,
    guideCentroidPixelsForHalfImagingPixel: 0.5 / guideToImagingRatio,
  };
}
