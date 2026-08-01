export const MODIFIER_EFFECTS_PERSISTENCE_KEY =
  "astrotools.modifier-effects.settings.v1";
export const MODIFIER_TELESCOPE_APPLIED_KEY =
  "astrotools.modifier-effects.applied-telescope.v1";
export const MODIFIER_CAMERA_APPLIED_KEY =
  "astrotools.modifier-effects.applied-camera.v1";
export const MODIFIER_TRAIN_APPLIED_KEY =
  "astrotools.modifier-effects.applied-train.v1";

export interface ModifierEffectsValues {
  nativeFocalLengthMm: string;
  apertureMm: string;
  modifierFactor: string;
  sensorWidthMm: string;
  sensorHeightMm: string;
  pixelSizeUm: string;
  binningFactor: string;
}

export function serializeModifierEffects(
  values: ModifierEffectsValues,
): string {
  return JSON.stringify({ version: 1, values });
}

export function parseModifierEffects(
  value: string,
): ModifierEffectsValues | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as { version?: unknown; values?: unknown };
    if (
      !candidate ||
      candidate.version !== 1 ||
      !candidate.values ||
      typeof candidate.values !== "object"
    )
      return null;
    const values = candidate.values as Record<string, unknown>;
    const fields: readonly (keyof ModifierEffectsValues)[] = [
      "nativeFocalLengthMm",
      "apertureMm",
      "modifierFactor",
      "sensorWidthMm",
      "sensorHeightMm",
      "pixelSizeUm",
      "binningFactor",
    ];
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
    ) as unknown as ModifierEffectsValues;
  } catch {
    return null;
  }
}
