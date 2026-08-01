export const EXPOSURE_SNR_PERSISTENCE_KEY =
  "astrotools.exposure-snr.settings.v1";
export const EXPOSURE_SNR_TRAIN_APPLIED_KEY =
  "astrotools.exposure-snr.train-applied.v1";
export interface ExposureSnrValues {
  effectiveFocalLengthMm: string;
  pixelSizeUm: string;
  binningFactor: string;
  sourceRateElectronsPerSecPerArcsec2: string;
  skyRateElectronsPerSecPerArcsec2: string;
  darkCurrentElectronsPerSecPerPixel: string;
  readNoiseElectrons: string;
  subExposureSeconds: string;
  frameCount: string;
}
const fields = [
  "effectiveFocalLengthMm",
  "pixelSizeUm",
  "binningFactor",
  "sourceRateElectronsPerSecPerArcsec2",
  "skyRateElectronsPerSecPerArcsec2",
  "darkCurrentElectronsPerSecPerPixel",
  "readNoiseElectrons",
  "subExposureSeconds",
  "frameCount",
] as const;
export const serializeExposureSnr = (values: ExposureSnrValues) =>
  JSON.stringify({ version: 1, values });
export function parseExposureSnr(raw: string): ExposureSnrValues | null {
  try {
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      values?: Record<string, unknown>;
    };
    if (
      parsed.version !== 1 ||
      !parsed.values ||
      fields.some(
        (field) =>
          typeof parsed.values?.[field] !== "string" ||
          !Number.isFinite(Number(parsed.values[field])),
      )
    )
      return null;
    return Object.fromEntries(
      fields.map((field) => [field, parsed.values?.[field]]),
    ) as unknown as ExposureSnrValues;
  } catch {
    return null;
  }
}
