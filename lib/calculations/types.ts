export interface EffectiveFocalLengthInput {
  readonly nativeFocalLengthMm: number;
  readonly opticalMultipliers?: readonly number[];
}

export interface EffectiveFocalRatioInput {
  readonly effectiveFocalLengthMm: number;
  readonly apertureMm: number;
}

export interface DerivedFocalLengthInput {
  readonly apertureMm: number;
  readonly focalRatio: number;
}

export interface DerivedSensorDimensionsInput {
  readonly resolutionWidthPx: number;
  readonly resolutionHeightPx: number;
  readonly nativePixelSizeUm: number;
}

export interface PhysicalSensorGeometryInput {
  readonly source: "physical-dimensions";
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface PixelResolutionSensorGeometryInput {
  readonly source: "pixel-resolution";
  readonly resolutionWidthPx: number;
  readonly resolutionHeightPx: number;
}

export type SensorGeometryInput =
  PhysicalSensorGeometryInput | PixelResolutionSensorGeometryInput;

export interface CameraSensorInput {
  readonly geometry: SensorGeometryInput;
  readonly nativePixelSizeUm: number;
}

export interface SensorDimensionsMm {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly diagonalMm: number;
}

export interface ExactFieldOfViewInput {
  readonly effectiveFocalLengthMm: number;
  readonly sensorWidthMm: number;
  readonly sensorHeightMm: number;
}

export interface FieldOfViewDeg {
  readonly horizontalDeg: number;
  readonly verticalDeg: number;
  readonly diagonalDeg: number;
}

export interface EffectivePixelSizeInput {
  readonly nativePixelSizeUm: number;
  readonly binningFactor: number;
}

export interface ImageScaleInput {
  readonly effectivePixelSizeUm: number;
  readonly effectiveFocalLengthMm: number;
}

export interface PixelsPerSeeingFwhmInput {
  readonly seeingFwhmArcsec: number;
  readonly imageScaleArcsecPerPixel: number;
}

export type SamplingAssessment =
  "likely-undersampled" | "broadly-appropriate" | "likely-oversampled";

export interface ImagingSystemInput {
  readonly nativeFocalLengthMm: number;
  readonly apertureMm: number;
  readonly opticalMultipliers?: readonly number[];
  readonly sensor: CameraSensorInput;
  readonly binningFactor: number;
  readonly seeingFwhmArcsec: number;
}

export interface ImagingSystemResult {
  readonly effectiveFocalLengthMm: number;
  readonly effectiveFocalRatio: number;
  readonly sensorDimensionsMm: SensorDimensionsMm;
  readonly fieldOfViewDeg: FieldOfViewDeg;
  readonly effectivePixelSizeUm: number;
  readonly imageScaleArcsecPerPixel: number;
  readonly pixelsPerSeeingFwhm: number;
  readonly samplingAssessment: SamplingAssessment;
}
