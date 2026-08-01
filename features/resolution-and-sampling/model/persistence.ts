import type { ResolutionAndSamplingInput } from "@/lib/calculations";

export const RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY =
  "astrotools.resolution-and-sampling.settings.v1";
export const RESOLUTION_TELESCOPE_APPLIED_KEY =
  "astrotools.resolution-and-sampling.applied-telescope.v1";
export const RESOLUTION_CAMERA_APPLIED_KEY =
  "astrotools.resolution-and-sampling.applied-camera.v1";

export interface PersistedResolutionAndSamplingState {
  readonly version: 1;
  readonly values: Record<keyof ResolutionAndSamplingInput, string>;
}

export function serializeResolutionAndSamplingState(
  values: PersistedResolutionAndSamplingState["values"],
): string {
  return JSON.stringify({ version: 1, values });
}

export function parseResolutionAndSamplingState(
  value: string,
): PersistedResolutionAndSamplingState["values"] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1 ||
      !("values" in parsed) ||
      !parsed.values ||
      typeof parsed.values !== "object"
    ) {
      return null;
    }
    const values = parsed.values as Record<string, unknown>;
    const fields: readonly (keyof ResolutionAndSamplingInput)[] = [
      "apertureMm",
      "wavelengthNm",
      "focalLengthMm",
      "pixelSizeUm",
      "binningFactor",
      "seeingFwhmArcsec",
    ];
    if (
      fields.some(
        (field) =>
          typeof values[field] !== "string" ||
          !Number.isFinite(Number(values[field])) ||
          Number(values[field]) <= 0,
      )
    ) {
      return null;
    }
    return Object.fromEntries(
      fields.map((field) => [field, values[field] as string]),
    ) as PersistedResolutionAndSamplingState["values"];
  } catch {
    return null;
  }
}
