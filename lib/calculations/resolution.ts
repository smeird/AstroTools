import { IMAGE_SCALE_ARCSECONDS_CONSTANT } from "./constants";
import {
  CalculationInputError,
  requirePositiveFiniteNumber,
  requirePositiveFiniteResult,
  requirePositiveSafeInteger,
} from "./validation";

const ARCSECONDS_PER_RADIAN = 206264.80624709636;
const RAYLEIGH_FACTOR = 1.22;
const DAWES_CONSTANT_ARCSECONDS_MM = 116;

export interface ResolutionAndSamplingInput {
  readonly apertureMm: number;
  readonly wavelengthNm: number;
  readonly focalLengthMm: number;
  readonly pixelSizeUm: number;
  readonly binningFactor: number;
  readonly seeingFwhmArcsec: number;
}

export interface ResolutionAndSamplingResult {
  readonly rayleighLimitArcsec: number;
  readonly dawesLimitArcsec: number;
  readonly effectivePixelSizeUm: number;
  readonly imageScaleArcsecPerPixel: number;
  readonly pixelsPerRayleighLimit: number;
  readonly pixelsPerSeeingFwhm: number;
  readonly criticalFocalLengthMm: number;
  readonly criticalFocalRatio: number;
}

function requirePositiveInteger(value: number, name: string): number {
  return requirePositiveSafeInteger(value, name);
}

export function calculateResolutionAndSampling({
  apertureMm: apertureInput,
  wavelengthNm: wavelengthInput,
  focalLengthMm: focalLengthInput,
  pixelSizeUm: pixelSizeInput,
  binningFactor: binningInput,
  seeingFwhmArcsec: seeingInput,
}: ResolutionAndSamplingInput): ResolutionAndSamplingResult {
  const apertureMm = requirePositiveFiniteNumber(apertureInput, "apertureMm");
  const wavelengthNm = requirePositiveFiniteNumber(
    wavelengthInput,
    "wavelengthNm",
  );
  const focalLengthMm = requirePositiveFiniteNumber(
    focalLengthInput,
    "focalLengthMm",
  );
  const pixelSizeUm = requirePositiveFiniteNumber(
    pixelSizeInput,
    "pixelSizeUm",
  );
  const binningFactor = requirePositiveInteger(binningInput, "binningFactor");
  const seeingFwhmArcsec = requirePositiveFiniteNumber(
    seeingInput,
    "seeingFwhmArcsec",
  );

  const wavelengthMm = wavelengthNm / 1_000_000;
  const rayleighLimitArcsec = requirePositiveFiniteResult(
    (RAYLEIGH_FACTOR * wavelengthMm * ARCSECONDS_PER_RADIAN) / apertureMm,
    "rayleighLimitArcsec",
  );
  const dawesLimitArcsec = requirePositiveFiniteResult(
    DAWES_CONSTANT_ARCSECONDS_MM / apertureMm,
    "dawesLimitArcsec",
  );
  const effectivePixelSizeUm = pixelSizeUm * binningFactor;
  const imageScaleArcsecPerPixel = requirePositiveFiniteResult(
    (IMAGE_SCALE_ARCSECONDS_CONSTANT * effectivePixelSizeUm) / focalLengthMm,
    "imageScaleArcsecPerPixel",
  );
  const pixelsPerRayleighLimit = requirePositiveFiniteResult(
    rayleighLimitArcsec / imageScaleArcsecPerPixel,
    "pixelsPerRayleighLimit",
  );
  const pixelsPerSeeingFwhm = requirePositiveFiniteResult(
    seeingFwhmArcsec / imageScaleArcsecPerPixel,
    "pixelsPerSeeingFwhm",
  );
  const criticalFocalLengthMm = requirePositiveFiniteResult(
    (2 * IMAGE_SCALE_ARCSECONDS_CONSTANT * effectivePixelSizeUm) /
      rayleighLimitArcsec,
    "criticalFocalLengthMm",
  );
  const criticalFocalRatio = requirePositiveFiniteResult(
    criticalFocalLengthMm / apertureMm,
    "criticalFocalRatio",
  );

  return {
    rayleighLimitArcsec,
    dawesLimitArcsec,
    effectivePixelSizeUm,
    imageScaleArcsecPerPixel,
    pixelsPerRayleighLimit,
    pixelsPerSeeingFwhm,
    criticalFocalLengthMm,
    criticalFocalRatio,
  };
}

export function classifyResolutionSampling(
  pixelsPerRayleighLimit: number,
): "undersampled" | "critically-sampled" | "oversampled" {
  const pixels = requirePositiveFiniteNumber(
    pixelsPerRayleighLimit,
    "pixelsPerRayleighLimit",
  );

  if (pixels < 2) return "undersampled";
  if (pixels > 4) return "oversampled";
  return "critically-sampled";
}

export { CalculationInputError };
