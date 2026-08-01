export const BACKFOCUS_SPACING_PERSISTENCE_KEY =
  "astrotools.backfocus-spacing.settings.v1";

export interface BackfocusSpacingValues {
  nominalBackfocusMm: string;
  cameraDepthMm: string;
  filterWheelDepthMm: string;
  guiderDepthMm: string;
  otherAdaptersMm: string;
  installedSpacerMm: string;
  filterThicknessMm: string;
  filterRefractiveIndex: string;
}

const fields = [
  "nominalBackfocusMm",
  "cameraDepthMm",
  "filterWheelDepthMm",
  "guiderDepthMm",
  "otherAdaptersMm",
  "installedSpacerMm",
  "filterThicknessMm",
  "filterRefractiveIndex",
] as const;

export function serializeBackfocusSpacing(
  values: BackfocusSpacingValues,
): string {
  return JSON.stringify({ version: 1, values });
}

export function parseBackfocusSpacing(
  value: string,
): BackfocusSpacingValues | null {
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
          Number(values[field]) < 0,
      ) ||
      Number(values.filterRefractiveIndex) <= 1
    )
      return null;
    return Object.fromEntries(
      fields.map((field) => [field, values[field]]),
    ) as unknown as BackfocusSpacingValues;
  } catch {
    return null;
  }
}
