export const POLAR_DRIFT_PERSISTENCE_KEY = "astrotools.polar-drift.settings.v1";
export const POLAR_DRIFT_TRAIN_APPLIED_KEY =
  "astrotools.polar-drift.train-applied.v1";
export interface PolarDriftValues {
  driftPixels: string;
  durationMinutes: string;
  effectiveFocalLengthMm: string;
  pixelSizeUm: string;
  binningFactor: string;
  latitudeDeg: string;
  hourAngleDeg: string;
}
const fields = [
  "driftPixels",
  "durationMinutes",
  "effectiveFocalLengthMm",
  "pixelSizeUm",
  "binningFactor",
  "latitudeDeg",
  "hourAngleDeg",
] as const;
export const serializePolarDrift = (values: PolarDriftValues) =>
  JSON.stringify({ version: 1, values });
export function parsePolarDrift(raw: string): PolarDriftValues | null {
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
    ) as unknown as PolarDriftValues;
  } catch {
    return null;
  }
}
