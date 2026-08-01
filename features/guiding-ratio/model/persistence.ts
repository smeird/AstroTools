export const GUIDING_RATIO_PERSISTENCE_KEY =
  "astrotools.guiding-ratio.settings.v1";
export const GUIDING_TELESCOPE_APPLIED_KEY =
  "astrotools.guiding-ratio.telescope-applied.v1";
export const GUIDING_CAMERA_APPLIED_KEY =
  "astrotools.guiding-ratio.camera-applied.v1";
export const GUIDING_TRAIN_APPLIED_KEY =
  "astrotools.guiding-ratio.train-applied.v1";

export interface GuidingRatioValues {
  imagingFocalLengthMm: string;
  imagingPixelSizeUm: string;
  imagingBinning: string;
  guideFocalLengthMm: string;
  guidePixelSizeUm: string;
  guideBinning: string;
}

const fields = [
  "imagingFocalLengthMm",
  "imagingPixelSizeUm",
  "imagingBinning",
  "guideFocalLengthMm",
  "guidePixelSizeUm",
  "guideBinning",
] as const;

export function serializeGuidingRatio(values: GuidingRatioValues): string {
  return JSON.stringify({ version: 1, values });
}

export function parseGuidingRatio(value: string): GuidingRatioValues | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as { version?: unknown; values?: unknown };
    if (
      candidate.version !== 1 ||
      !candidate.values ||
      typeof candidate.values !== "object"
    )
      return null;
    const values = candidate.values as Record<string, unknown>;
    if (
      fields.some(
        (field) =>
          typeof values[field] !== "string" ||
          !Number.isFinite(Number(values[field])) ||
          Number(values[field]) <= 0,
      )
    )
      return null;
    return Object.fromEntries(
      fields.map((field) => [field, values[field]]),
    ) as unknown as GuidingRatioValues;
  } catch {
    return null;
  }
}
