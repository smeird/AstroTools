import { calculateImageScale } from "./engine";

export interface ExposureSnrInput {
  readonly effectiveFocalLengthMm: number;
  readonly pixelSizeUm: number;
  readonly binningFactor: number;
  readonly sourceRateElectronsPerSecPerArcsec2: number;
  readonly skyRateElectronsPerSecPerArcsec2: number;
  readonly darkCurrentElectronsPerSecPerPixel: number;
  readonly readNoiseElectrons: number;
  readonly subExposureSeconds: number;
  readonly frameCount: number;
}

export interface ExposureSnrResult {
  readonly imageScaleArcsecPerPixel: number;
  readonly pixelAreaArcsec2: number;
  readonly sourceElectrons: number;
  readonly skyElectrons: number;
  readonly darkElectrons: number;
  readonly readNoiseVariance: number;
  readonly totalIntegrationSeconds: number;
  readonly snr: number;
  readonly singleFrameSnr: number;
  readonly skyToReadNoiseVarianceRatio: number;
}

const nonNegative = (name: string, value: number) => {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be finite and non-negative`);
};

export function calculateExposureSnr(
  input: ExposureSnrInput,
): ExposureSnrResult {
  nonNegative("sourceRate", input.sourceRateElectronsPerSecPerArcsec2);
  nonNegative("skyRate", input.skyRateElectronsPerSecPerArcsec2);
  nonNegative("darkCurrent", input.darkCurrentElectronsPerSecPerPixel);
  nonNegative("readNoise", input.readNoiseElectrons);
  if (
    !Number.isFinite(input.subExposureSeconds) ||
    input.subExposureSeconds <= 0
  )
    throw new RangeError("subExposureSeconds must be positive");
  if (!Number.isInteger(input.frameCount) || input.frameCount <= 0)
    throw new RangeError("frameCount must be a positive integer");

  const imageScaleArcsecPerPixel = calculateImageScale({
    effectiveFocalLengthMm: input.effectiveFocalLengthMm,
    effectivePixelSizeUm: input.pixelSizeUm * input.binningFactor,
  });
  const pixelAreaArcsec2 = imageScaleArcsecPerPixel ** 2;
  const sourcePerFrame =
    input.sourceRateElectronsPerSecPerArcsec2 *
    pixelAreaArcsec2 *
    input.subExposureSeconds;
  const skyPerFrame =
    input.skyRateElectronsPerSecPerArcsec2 *
    pixelAreaArcsec2 *
    input.subExposureSeconds;
  const darkPerFrame =
    input.darkCurrentElectronsPerSecPerPixel * input.subExposureSeconds;
  const readNoiseVariancePerFrame = input.readNoiseElectrons ** 2;
  const variancePerFrame =
    sourcePerFrame + skyPerFrame + darkPerFrame + readNoiseVariancePerFrame;
  const singleFrameSnr =
    variancePerFrame === 0 ? 0 : sourcePerFrame / Math.sqrt(variancePerFrame);
  const sourceElectrons = sourcePerFrame * input.frameCount;
  const skyElectrons = skyPerFrame * input.frameCount;
  const darkElectrons = darkPerFrame * input.frameCount;
  const readNoiseVariance = readNoiseVariancePerFrame * input.frameCount;
  const totalVariance =
    sourceElectrons + skyElectrons + darkElectrons + readNoiseVariance;

  return {
    imageScaleArcsecPerPixel,
    pixelAreaArcsec2,
    sourceElectrons,
    skyElectrons,
    darkElectrons,
    readNoiseVariance,
    totalIntegrationSeconds: input.subExposureSeconds * input.frameCount,
    snr: totalVariance === 0 ? 0 : sourceElectrons / Math.sqrt(totalVariance),
    singleFrameSnr,
    skyToReadNoiseVarianceRatio:
      readNoiseVariancePerFrame === 0
        ? Infinity
        : skyPerFrame / readNoiseVariancePerFrame,
  };
}
