import { calculateImageScale } from "./engine";

const SIDEREAL_DRIFT_ARCSEC_PER_MINUTE_PER_RADIAN = 900;
const ARCMINUTES_PER_RADIAN = (180 * 60) / Math.PI;

export interface PolarAlignmentDriftInput {
  readonly driftPixels: number;
  readonly durationMinutes: number;
  readonly effectiveFocalLengthMm: number;
  readonly pixelSizeUm: number;
  readonly binningFactor: number;
  readonly latitudeDeg: number;
  readonly hourAngleDeg: number;
}

export interface PolarAlignmentDriftResult {
  readonly imageScaleArcsecPerPixel: number;
  readonly driftArcsec: number;
  readonly driftRateArcsecPerMinute: number;
  readonly azimuthErrorArcmin: number | null;
  readonly altitudeErrorArcmin: number | null;
  readonly azimuthSensitivity: number;
  readonly altitudeSensitivity: number;
}

export function calculatePolarAlignmentDrift(
  input: PolarAlignmentDriftInput,
): PolarAlignmentDriftResult {
  if (!Number.isFinite(input.driftPixels))
    throw new RangeError("driftPixels must be finite");
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0)
    throw new RangeError("durationMinutes must be positive");
  if (!Number.isFinite(input.latitudeDeg) || Math.abs(input.latitudeDeg) > 90)
    throw new RangeError("latitudeDeg must be between -90 and 90");
  if (
    !Number.isFinite(input.hourAngleDeg) ||
    Math.abs(input.hourAngleDeg) > 180
  )
    throw new RangeError("hourAngleDeg must be between -180 and 180");

  const imageScaleArcsecPerPixel = calculateImageScale({
    effectiveFocalLengthMm: input.effectiveFocalLengthMm,
    effectivePixelSizeUm: input.pixelSizeUm * input.binningFactor,
  });
  const driftArcsec = input.driftPixels * imageScaleArcsecPerPixel;
  const driftRateArcsecPerMinute = driftArcsec / input.durationMinutes;
  const latitudeRad = (input.latitudeDeg * Math.PI) / 180;
  const hourAngleRad = (input.hourAngleDeg * Math.PI) / 180;
  const azimuthSensitivity = Math.cos(latitudeRad) * Math.cos(hourAngleRad);
  const altitudeSensitivity = Math.sin(hourAngleRad);
  const error = (sensitivity: number) =>
    Math.abs(sensitivity) < 0.05
      ? null
      : (driftRateArcsecPerMinute /
          (SIDEREAL_DRIFT_ARCSEC_PER_MINUTE_PER_RADIAN * sensitivity)) *
        ARCMINUTES_PER_RADIAN;

  return {
    imageScaleArcsecPerPixel,
    driftArcsec,
    driftRateArcsecPerMinute,
    azimuthErrorArcmin: error(azimuthSensitivity),
    altitudeErrorArcmin: error(altitudeSensitivity),
    azimuthSensitivity,
    altitudeSensitivity,
  };
}
