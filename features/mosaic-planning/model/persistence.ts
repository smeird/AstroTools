export const MOSAIC_PERSISTENCE_KEY = "astrotools.mosaic-planning.settings.v1";
export const MOSAIC_TRAIN_APPLIED_KEY =
  "astrotools.mosaic-planning.train-applied.v1";
export interface MosaicValues {
  effectiveFocalLengthMm: string;
  sensorWidthMm: string;
  sensorHeightMm: string;
  targetWidthDeg: string;
  targetHeightDeg: string;
  overlapPercent: string;
  hoursPerPanel: string;
}
const fields = [
  "effectiveFocalLengthMm",
  "sensorWidthMm",
  "sensorHeightMm",
  "targetWidthDeg",
  "targetHeightDeg",
  "overlapPercent",
  "hoursPerPanel",
] as const;
export const serializeMosaic = (values: MosaicValues) =>
  JSON.stringify({ version: 1, values });
export function parseMosaic(raw: string): MosaicValues | null {
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
    ) as unknown as MosaicValues;
  } catch {
    return null;
  }
}
