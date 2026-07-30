import {
  IMAGE_SCALE_ARCSECONDS_CONSTANT,
  SAMPLING_THRESHOLDS,
} from "./constants";
import type {
  CameraSensorInput,
  DerivedFocalLengthInput,
  DerivedSensorDimensionsInput,
  EffectiveFocalLengthInput,
  EffectiveFocalRatioInput,
  EffectivePixelSizeInput,
  ExactFieldOfViewInput,
  FieldOfViewDeg,
  ImageScaleInput,
  ImagingSystemInput,
  ImagingSystemResult,
  PixelsPerSeeingFwhmInput,
  SamplingAssessment,
  SensorDimensionsMm,
} from "./types";
import {
  CalculationInputError,
  requirePositiveFiniteNumber,
  requirePositiveFiniteResult,
  requirePositiveSafeInteger,
} from "./validation";

const DEGREES_PER_RADIAN = 180 / Math.PI;

interface ScaledPositiveNumber {
  mantissa: number;
  exponent: number;
}

function decomposePositiveNumber(value: number): ScaledPositiveNumber {
  let exponent = Math.floor(Math.log2(value));
  let powerOfTwo = 2 ** exponent;

  if (!Number.isFinite(powerOfTwo)) {
    exponent = 1023;
    powerOfTwo = 2 ** exponent;
  } else if (powerOfTwo === 0) {
    exponent = -1074;
    powerOfTwo = Number.MIN_VALUE;
  }

  let mantissa = value / powerOfTwo;

  if (mantissa < 1) {
    mantissa *= 2;
    exponent -= 1;
  } else if (mantissa >= 2) {
    mantissa /= 2;
    exponent += 1;
  }

  return { mantissa, exponent };
}

function normaliseScaledNumber({
  mantissa: mantissaInput,
  exponent: exponentInput,
}: ScaledPositiveNumber): ScaledPositiveNumber {
  let mantissa = mantissaInput;
  let exponent = exponentInput;

  while (mantissa >= 2) {
    mantissa /= 2;
    exponent += 1;
  }

  while (mantissa < 1) {
    mantissa *= 2;
    exponent -= 1;
  }

  return { mantissa, exponent };
}

function composeScaledNumber({
  mantissa,
  exponent,
}: ScaledPositiveNumber): number {
  if (exponent > 1023 || exponent < -1075) {
    return exponent > 1023 ? Number.POSITIVE_INFINITY : 0;
  }

  if (exponent === -1075) {
    return (mantissa / 2) * Number.MIN_VALUE;
  }

  return mantissa * 2 ** exponent;
}

// Multiplying normalized mantissas while tracking binary exponents avoids
// order-dependent intermediate overflow and underflow. Sorting copies makes a
// modifier product deterministic without mutating caller-owned arrays.
function calculatePositiveProductRatio(
  numeratorValues: readonly number[],
  denominatorValues: readonly number[],
  resultName: string,
): number {
  let scaledValue: ScaledPositiveNumber = { mantissa: 1, exponent: 0 };

  for (const value of [...numeratorValues].sort(
    (left, right) => left - right,
  )) {
    const factor = decomposePositiveNumber(value);
    scaledValue = normaliseScaledNumber({
      mantissa: scaledValue.mantissa * factor.mantissa,
      exponent: scaledValue.exponent + factor.exponent,
    });
  }

  for (const value of [...denominatorValues].sort(
    (left, right) => left - right,
  )) {
    const divisor = decomposePositiveNumber(value);
    scaledValue = normaliseScaledNumber({
      mantissa: scaledValue.mantissa / divisor.mantissa,
      exponent: scaledValue.exponent - divisor.exponent,
    });
  }

  return requirePositiveFiniteResult(
    composeScaledNumber(scaledValue),
    resultName,
  );
}

function createSensorDimensions(
  widthMmInput: number,
  heightMmInput: number,
): SensorDimensionsMm {
  const widthMm = requirePositiveFiniteNumber(widthMmInput, "sensorWidthMm");
  const heightMm = requirePositiveFiniteNumber(heightMmInput, "sensorHeightMm");
  const diagonalMm = requirePositiveFiniteResult(
    Math.hypot(widthMm, heightMm),
    "sensorDiagonalMm",
  );

  return { widthMm, heightMm, diagonalMm };
}

function calculateAngleDegrees(
  sensorExtentMm: number,
  effectiveFocalLengthMm: number,
  resultName: string,
): number {
  const angleDegrees =
    2 *
    Math.atan(sensorExtentMm / effectiveFocalLengthMm / 2) *
    DEGREES_PER_RADIAN;

  return requirePositiveFiniteResult(angleDegrees, resultName);
}

export function calculateEffectiveFocalLength({
  nativeFocalLengthMm: nativeFocalLengthInput,
  opticalMultipliers = [],
}: EffectiveFocalLengthInput): number {
  const nativeFocalLengthMm = requirePositiveFiniteNumber(
    nativeFocalLengthInput,
    "nativeFocalLengthMm",
  );
  const validatedMultipliers: number[] = [];

  for (let index = 0; index < opticalMultipliers.length; index += 1) {
    if (!(index in opticalMultipliers)) {
      throw new CalculationInputError(
        `opticalMultipliers[${index}]`,
        "must be provided",
      );
    }

    validatedMultipliers.push(
      requirePositiveFiniteNumber(
        opticalMultipliers[index] as number,
        `opticalMultipliers[${index}]`,
      ),
    );
  }

  return calculatePositiveProductRatio(
    [nativeFocalLengthMm, ...validatedMultipliers],
    [],
    "effectiveFocalLengthMm",
  );
}

export function calculateEffectiveFocalRatio({
  effectiveFocalLengthMm: effectiveFocalLengthInput,
  apertureMm: apertureInput,
}: EffectiveFocalRatioInput): number {
  const effectiveFocalLengthMm = requirePositiveFiniteNumber(
    effectiveFocalLengthInput,
    "effectiveFocalLengthMm",
  );
  const apertureMm = requirePositiveFiniteNumber(apertureInput, "apertureMm");

  return requirePositiveFiniteResult(
    effectiveFocalLengthMm / apertureMm,
    "effectiveFocalRatio",
  );
}

export function deriveFocalLength({
  apertureMm: apertureInput,
  focalRatio: focalRatioInput,
}: DerivedFocalLengthInput): number {
  const apertureMm = requirePositiveFiniteNumber(apertureInput, "apertureMm");
  const focalRatio = requirePositiveFiniteNumber(focalRatioInput, "focalRatio");

  return calculatePositiveProductRatio(
    [apertureMm, focalRatio],
    [],
    "nativeFocalLengthMm",
  );
}

export function deriveSensorDimensions({
  resolutionWidthPx: resolutionWidthInput,
  resolutionHeightPx: resolutionHeightInput,
  nativePixelSizeUm: nativePixelSizeInput,
}: DerivedSensorDimensionsInput): SensorDimensionsMm {
  const resolutionWidthPx = requirePositiveSafeInteger(
    resolutionWidthInput,
    "resolutionWidthPx",
  );
  const resolutionHeightPx = requirePositiveSafeInteger(
    resolutionHeightInput,
    "resolutionHeightPx",
  );
  const nativePixelSizeUm = requirePositiveFiniteNumber(
    nativePixelSizeInput,
    "nativePixelSizeUm",
  );
  const widthMm = calculatePositiveProductRatio(
    [resolutionWidthPx, nativePixelSizeUm],
    [1000],
    "sensorWidthMm",
  );
  const heightMm = calculatePositiveProductRatio(
    [resolutionHeightPx, nativePixelSizeUm],
    [1000],
    "sensorHeightMm",
  );

  return createSensorDimensions(widthMm, heightMm);
}

export function resolveSensorDimensions({
  geometry,
  nativePixelSizeUm,
}: CameraSensorInput): SensorDimensionsMm {
  switch (geometry.source) {
    case "physical-dimensions":
      return createSensorDimensions(geometry.widthMm, geometry.heightMm);
    case "pixel-resolution":
      return deriveSensorDimensions({
        resolutionWidthPx: geometry.resolutionWidthPx,
        resolutionHeightPx: geometry.resolutionHeightPx,
        nativePixelSizeUm,
      });
  }
}

export function calculateExactFieldOfView({
  effectiveFocalLengthMm: effectiveFocalLengthInput,
  sensorWidthMm,
  sensorHeightMm,
}: ExactFieldOfViewInput): FieldOfViewDeg {
  const effectiveFocalLengthMm = requirePositiveFiniteNumber(
    effectiveFocalLengthInput,
    "effectiveFocalLengthMm",
  );
  const sensorDimensions = createSensorDimensions(
    sensorWidthMm,
    sensorHeightMm,
  );

  return {
    horizontalDeg: calculateAngleDegrees(
      sensorDimensions.widthMm,
      effectiveFocalLengthMm,
      "horizontalFieldOfViewDeg",
    ),
    verticalDeg: calculateAngleDegrees(
      sensorDimensions.heightMm,
      effectiveFocalLengthMm,
      "verticalFieldOfViewDeg",
    ),
    diagonalDeg: calculateAngleDegrees(
      sensorDimensions.diagonalMm,
      effectiveFocalLengthMm,
      "diagonalFieldOfViewDeg",
    ),
  };
}

export function calculateEffectivePixelSize({
  nativePixelSizeUm: nativePixelSizeInput,
  binningFactor: binningFactorInput,
}: EffectivePixelSizeInput): number {
  const nativePixelSizeUm = requirePositiveFiniteNumber(
    nativePixelSizeInput,
    "nativePixelSizeUm",
  );
  const binningFactor = requirePositiveSafeInteger(
    binningFactorInput,
    "binningFactor",
  );

  return requirePositiveFiniteResult(
    nativePixelSizeUm * binningFactor,
    "effectivePixelSizeUm",
  );
}

export function calculateImageScale({
  effectivePixelSizeUm: effectivePixelSizeInput,
  effectiveFocalLengthMm: effectiveFocalLengthInput,
}: ImageScaleInput): number {
  const effectivePixelSizeUm = requirePositiveFiniteNumber(
    effectivePixelSizeInput,
    "effectivePixelSizeUm",
  );
  const effectiveFocalLengthMm = requirePositiveFiniteNumber(
    effectiveFocalLengthInput,
    "effectiveFocalLengthMm",
  );

  return calculatePositiveProductRatio(
    [IMAGE_SCALE_ARCSECONDS_CONSTANT, effectivePixelSizeUm],
    [effectiveFocalLengthMm],
    "imageScaleArcsecPerPixel",
  );
}

export function calculatePixelsPerSeeingFwhm({
  seeingFwhmArcsec: seeingFwhmInput,
  imageScaleArcsecPerPixel: imageScaleInput,
}: PixelsPerSeeingFwhmInput): number {
  const seeingFwhmArcsec = requirePositiveFiniteNumber(
    seeingFwhmInput,
    "seeingFwhmArcsec",
  );
  const imageScaleArcsecPerPixel = requirePositiveFiniteNumber(
    imageScaleInput,
    "imageScaleArcsecPerPixel",
  );

  return requirePositiveFiniteResult(
    seeingFwhmArcsec / imageScaleArcsecPerPixel,
    "pixelsPerSeeingFwhm",
  );
}

export function assessSampling(
  pixelsPerSeeingFwhmInput: number,
): SamplingAssessment {
  const pixelsPerSeeingFwhm = requirePositiveFiniteNumber(
    pixelsPerSeeingFwhmInput,
    "pixelsPerSeeingFwhm",
  );

  if (
    pixelsPerSeeingFwhm < SAMPLING_THRESHOLDS.appropriateMinimumPixelsPerFwhm
  ) {
    return "likely-undersampled";
  }

  if (
    pixelsPerSeeingFwhm > SAMPLING_THRESHOLDS.appropriateMaximumPixelsPerFwhm
  ) {
    return "likely-oversampled";
  }

  return "broadly-appropriate";
}

export function calculateImagingSystem({
  nativeFocalLengthMm,
  apertureMm,
  opticalMultipliers = [],
  sensor,
  binningFactor,
  seeingFwhmArcsec,
}: ImagingSystemInput): ImagingSystemResult {
  const effectiveFocalLengthMm = calculateEffectiveFocalLength({
    nativeFocalLengthMm,
    opticalMultipliers,
  });
  const effectiveFocalRatio = calculateEffectiveFocalRatio({
    effectiveFocalLengthMm,
    apertureMm,
  });
  const sensorDimensionsMm = resolveSensorDimensions(sensor);
  const fieldOfViewDeg = calculateExactFieldOfView({
    effectiveFocalLengthMm,
    sensorWidthMm: sensorDimensionsMm.widthMm,
    sensorHeightMm: sensorDimensionsMm.heightMm,
  });
  const effectivePixelSizeUm = calculateEffectivePixelSize({
    nativePixelSizeUm: sensor.nativePixelSizeUm,
    binningFactor,
  });
  const imageScaleArcsecPerPixel = calculateImageScale({
    effectivePixelSizeUm,
    effectiveFocalLengthMm,
  });
  const pixelsPerSeeingFwhm = calculatePixelsPerSeeingFwhm({
    seeingFwhmArcsec,
    imageScaleArcsecPerPixel,
  });

  return {
    effectiveFocalLengthMm,
    effectiveFocalRatio,
    sensorDimensionsMm,
    fieldOfViewDeg,
    effectivePixelSizeUm,
    imageScaleArcsecPerPixel,
    pixelsPerSeeingFwhm,
    samplingAssessment: assessSampling(pixelsPerSeeingFwhm),
  };
}
