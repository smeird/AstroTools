import {
  calculateEffectiveFocalLength,
  calculateEffectiveFocalRatio,
  calculateExactFieldOfView,
  calculateImageScale,
} from "./engine";
import type { FieldOfViewDeg } from "./types";

export interface ModifierEffectsInput {
  readonly nativeFocalLengthMm: number;
  readonly apertureMm: number;
  readonly modifierFactor: number;
  readonly sensorWidthMm: number;
  readonly sensorHeightMm: number;
  readonly pixelSizeUm: number;
  readonly binningFactor: number;
}

export interface ModifierEffectsSnapshot {
  readonly focalLengthMm: number;
  readonly focalRatio: number;
  readonly fieldOfViewDeg: FieldOfViewDeg;
  readonly imageScaleArcsecPerPixel: number;
}

export interface ModifierEffectsResult {
  readonly native: ModifierEffectsSnapshot;
  readonly modified: ModifierEffectsSnapshot;
  readonly focalLengthChangePercent: number;
  readonly imageScaleChangePercent: number;
}

function snapshot({
  focalLengthMm,
  apertureMm,
  sensorWidthMm,
  sensorHeightMm,
  pixelSizeUm,
  binningFactor,
}: Omit<ModifierEffectsInput, "nativeFocalLengthMm" | "modifierFactor"> & {
  focalLengthMm: number;
}): ModifierEffectsSnapshot {
  const effectivePixelSizeUm = pixelSizeUm * binningFactor;
  return {
    focalLengthMm,
    focalRatio: calculateEffectiveFocalRatio({
      effectiveFocalLengthMm: focalLengthMm,
      apertureMm,
    }),
    fieldOfViewDeg: calculateExactFieldOfView({
      effectiveFocalLengthMm: focalLengthMm,
      sensorWidthMm,
      sensorHeightMm,
    }),
    imageScaleArcsecPerPixel: calculateImageScale({
      effectivePixelSizeUm,
      effectiveFocalLengthMm: focalLengthMm,
    }),
  };
}

export function calculateModifierEffects({
  nativeFocalLengthMm,
  apertureMm,
  modifierFactor,
  sensorWidthMm,
  sensorHeightMm,
  pixelSizeUm,
  binningFactor,
}: ModifierEffectsInput): ModifierEffectsResult {
  const modifiedFocalLengthMm = calculateEffectiveFocalLength({
    nativeFocalLengthMm,
    opticalMultipliers: [modifierFactor],
  });
  const native = snapshot({
    focalLengthMm: nativeFocalLengthMm,
    apertureMm,
    sensorWidthMm,
    sensorHeightMm,
    pixelSizeUm,
    binningFactor,
  });
  const modified = snapshot({
    focalLengthMm: modifiedFocalLengthMm,
    apertureMm,
    sensorWidthMm,
    sensorHeightMm,
    pixelSizeUm,
    binningFactor,
  });

  return {
    native,
    modified,
    focalLengthChangePercent:
      ((modified.focalLengthMm - native.focalLengthMm) / native.focalLengthMm) *
      100,
    imageScaleChangePercent:
      ((modified.imageScaleArcsecPerPixel - native.imageScaleArcsecPerPixel) /
        native.imageScaleArcsecPerPixel) *
      100,
  };
}
