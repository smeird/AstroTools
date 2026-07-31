export interface SensorTiltInput {
  readonly sensorWidthMm: number;
  readonly sensorHeightMm: number;
  readonly horizontalFocusDifferenceUm: number;
  readonly verticalFocusDifferenceUm: number;
  readonly adjusterSpacingMm: number;
}

export interface SensorTiltResult {
  readonly horizontalTiltDeg: number;
  readonly verticalTiltDeg: number;
  readonly combinedTiltDeg: number;
  readonly combinedTiltArcmin: number;
  readonly cornerToCornerFocusDifferenceUm: number;
  readonly correctionAtAdjusterUm: number;
}

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}

export function calculateSensorTilt({
  sensorWidthMm,
  sensorHeightMm,
  horizontalFocusDifferenceUm,
  verticalFocusDifferenceUm,
  adjusterSpacingMm,
}: SensorTiltInput): SensorTiltResult {
  requirePositive("sensorWidthMm", sensorWidthMm);
  requirePositive("sensorHeightMm", sensorHeightMm);
  requirePositive("adjusterSpacingMm", adjusterSpacingMm);
  requireFinite("horizontalFocusDifferenceUm", horizontalFocusDifferenceUm);
  requireFinite("verticalFocusDifferenceUm", verticalFocusDifferenceUm);

  const horizontalSlope = horizontalFocusDifferenceUm / (sensorWidthMm * 1000);
  const verticalSlope = verticalFocusDifferenceUm / (sensorHeightMm * 1000);
  const combinedSlope = Math.hypot(horizontalSlope, verticalSlope);
  const radiansToDegrees = 180 / Math.PI;
  const combinedTiltDeg = Math.atan(combinedSlope) * radiansToDegrees;

  return {
    horizontalTiltDeg: Math.atan(horizontalSlope) * radiansToDegrees,
    verticalTiltDeg: Math.atan(verticalSlope) * radiansToDegrees,
    combinedTiltDeg,
    combinedTiltArcmin: combinedTiltDeg * 60,
    cornerToCornerFocusDifferenceUm: Math.hypot(
      horizontalFocusDifferenceUm,
      verticalFocusDifferenceUm,
    ),
    correctionAtAdjusterUm: combinedSlope * adjusterSpacingMm * 1000,
  };
}
