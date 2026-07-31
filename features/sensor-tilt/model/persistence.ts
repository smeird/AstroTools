export const SENSOR_TILT_PERSISTENCE_KEY = "astrotools.sensor-tilt.settings.v1";

export interface SensorTiltValues {
  sensorWidthMm: string;
  sensorHeightMm: string;
  horizontalFocusDifferenceUm: string;
  verticalFocusDifferenceUm: string;
  adjusterSpacingMm: string;
}

const fields: readonly (keyof SensorTiltValues)[] = [
  "sensorWidthMm",
  "sensorHeightMm",
  "horizontalFocusDifferenceUm",
  "verticalFocusDifferenceUm",
  "adjusterSpacingMm",
];

export function serializeSensorTilt(values: SensorTiltValues): string {
  return JSON.stringify({ version: 1, values });
}

export function parseSensorTilt(value: string): SensorTiltValues | null {
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
          !Number.isFinite(Number(values[field])),
      ) ||
      Number(values.sensorWidthMm) <= 0 ||
      Number(values.sensorHeightMm) <= 0 ||
      Number(values.adjusterSpacingMm) <= 0
    )
      return null;
    return Object.fromEntries(
      fields.map((field) => [field, values[field]]),
    ) as unknown as SensorTiltValues;
  } catch {
    return null;
  }
}
