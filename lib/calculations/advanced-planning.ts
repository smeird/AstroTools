import {
  requireFiniteNumber,
  requirePositiveFiniteNumber,
  requirePositiveSafeInteger,
} from "./validation";

const positive = (value: number, name: string) =>
  requirePositiveFiniteNumber(value, name);

export function calculateOptimalSubExposure(input: {
  readNoiseE: number;
  skyRateEPerPixelS: number;
  darkCurrentEPerPixelS: number;
  skyNoiseMultiple: number;
  fullWellE: number;
  brightStarRateEPerS: number;
  headroomPercent: number;
}) {
  const backgroundRate =
    positive(input.skyRateEPerPixelS, "sky rate") +
    requireFiniteNumber(input.darkCurrentEPerPixelS, "dark current");
  if (input.darkCurrentEPerPixelS < 0)
    throw new RangeError("dark current must not be negative");
  const minimumSeconds =
    (positive(input.skyNoiseMultiple, "sky-noise multiple") *
      positive(input.readNoiseE, "read noise") ** 2) /
    backgroundRate;
  const saturationLimitedSeconds =
    (positive(input.fullWellE, "full well") *
      (1 - positive(input.headroomPercent, "headroom") / 100)) /
    positive(input.brightStarRateEPerS, "bright-star rate");
  if (input.headroomPercent >= 100)
    throw new RangeError("headroom must be below 100 percent");
  return {
    minimumSeconds,
    saturationLimitedSeconds,
    recommendedSeconds: Math.max(
      0.1,
      Math.min(minimumSeconds * 1.5, saturationLimitedSeconds),
    ),
    backgroundRateEPerPixelS: backgroundRate,
    constrainedBySaturation: saturationLimitedSeconds < minimumSeconds,
  };
}

export function calculateIntegrationPlan(input: {
  totalHours: number;
  subExposureSeconds: number;
  rejectionPercent: number;
  currentIntegrationHours: number;
}) {
  const totalSeconds = positive(input.totalHours, "total integration") * 3600;
  const sub = positive(input.subExposureSeconds, "sub-exposure");
  const rejection = requireFiniteNumber(
    input.rejectionPercent,
    "rejection rate",
  );
  if (rejection < 0 || rejection >= 100)
    throw new RangeError("rejection rate must be from 0 to below 100 percent");
  const acceptedFrames = Math.ceil(totalSeconds / sub);
  const captureFrames = Math.ceil(acceptedFrames / (1 - rejection / 100));
  const remainingHours = Math.max(
    0,
    input.totalHours - Math.max(0, input.currentIntegrationHours),
  );
  return {
    acceptedFrames,
    captureFrames,
    rejectedFramesAllowance: captureFrames - acceptedFrames,
    captureHours: (captureFrames * sub) / 3600,
    remainingHours,
    relativeSnrGain: Math.sqrt(
      input.totalHours /
        Math.max(0.000_001, input.currentIntegrationHours || input.totalHours),
    ),
  };
}

export function calculateFilterAllocation(input: {
  totalHours: number;
  channel1Weight: number;
  channel2Weight: number;
  channel3Weight: number;
  channel1TransmissionPercent: number;
  channel2TransmissionPercent: number;
  channel3TransmissionPercent: number;
  subExposureSeconds: number;
}) {
  const total = positive(input.totalHours, "total time");
  const weights = [
    input.channel1Weight,
    input.channel2Weight,
    input.channel3Weight,
  ].map((v, i) => positive(v, `channel ${i + 1} weight`));
  const transmissions = [
    input.channel1TransmissionPercent,
    input.channel2TransmissionPercent,
    input.channel3TransmissionPercent,
  ].map((v, i) => positive(v, `channel ${i + 1} transmission`) / 100);
  if (transmissions.some((v) => v > 1))
    throw new RangeError("transmission must not exceed 100 percent");
  const adjusted = weights.map(
    (weight, index) => weight / transmissions[index]!,
  );
  const sum = adjusted.reduce((a, b) => a + b, 0);
  const hours = adjusted.map((value) => (total * value) / sum);
  const sub = positive(input.subExposureSeconds, "sub-exposure");
  return {
    channelHours: hours as [number, number, number],
    channelFrames: hours.map((value) => Math.ceil((value * 3600) / sub)) as [
      number,
      number,
      number,
    ],
  };
}

export function calculateStarSaturation(input: {
  fullWellE: number;
  gainEPerAdu: number;
  sourceRateEPerS: number;
  headroomPercent: number;
  exposureSeconds: number;
}) {
  const usableWell =
    positive(input.fullWellE, "full well") * (1 - input.headroomPercent / 100);
  if (input.headroomPercent < 0 || input.headroomPercent >= 100)
    throw new RangeError("headroom must be from 0 to below 100 percent");
  const rate = positive(input.sourceRateEPerS, "source rate");
  const electrons = rate * positive(input.exposureSeconds, "exposure");
  return {
    usableWellE: usableWell,
    saturationSeconds: usableWell / rate,
    predictedElectrons: electrons,
    predictedAdu: electrons / positive(input.gainEPerAdu, "gain"),
    wellPercent: (electrons / positive(input.fullWellE, "full well")) * 100,
    saturated: electrons >= usableWell,
  };
}

export function calculateGuidingExposure(input: {
  guideStarRateEPerS: number;
  skyRateEPerS: number;
  readNoiseE: number;
  targetSnr: number;
  mountErrorArcsecPerS: number;
  allowedMotionArcsec: number;
}) {
  const source = positive(input.guideStarRateEPerS, "guide-star rate");
  const background = Math.max(
    0,
    requireFiniteNumber(input.skyRateEPerS, "sky rate"),
  );
  const rn = positive(input.readNoiseE, "read noise");
  const snr2 = positive(input.targetSnr, "target SNR") ** 2;
  const b = snr2 * (source + background);
  const minimumSeconds =
    (b + Math.sqrt(b * b + 4 * source * source * snr2 * rn * rn)) /
    (2 * source * source);
  const motionLimitedSeconds =
    positive(input.allowedMotionArcsec, "allowed motion") /
    positive(input.mountErrorArcsecPerS, "mount error rate");
  return {
    minimumSeconds,
    motionLimitedSeconds,
    recommendedSeconds: Math.min(
      Math.max(0.2, minimumSeconds),
      motionLimitedSeconds,
    ),
    feasible: minimumSeconds <= motionLimitedSeconds,
  };
}

export function calculatePlateSolvingScale(input: {
  focalLengthMm: number;
  pixelSizeUm: number;
  widthPx: number;
  heightPx: number;
  scaleTolerancePercent: number;
}) {
  const scale =
    (206.265 * positive(input.pixelSizeUm, "pixel size")) /
    positive(input.focalLengthMm, "focal length");
  const tolerance =
    positive(input.scaleTolerancePercent, "scale tolerance") / 100;
  return {
    imageScaleArcsecPerPx: scale,
    fieldWidthDeg: (scale * positive(input.widthPx, "pixel width")) / 3600,
    fieldHeightDeg: (scale * positive(input.heightPx, "pixel height")) / 3600,
    searchScaleMin: scale * (1 - tolerance),
    searchScaleMax: scale * (1 + tolerance),
  };
}

export function calculateImagingWindow(input: {
  latitudeDeg: number;
  declinationDeg: number;
  minimumAltitudeDeg: number;
  darknessHours: number;
  exposureMinutes: number;
}) {
  const radians = Math.PI / 180;
  const lat = requireFiniteNumber(input.latitudeDeg, "latitude") * radians;
  const dec =
    requireFiniteNumber(input.declinationDeg, "declination") * radians;
  const altitude =
    requireFiniteNumber(input.minimumAltitudeDeg, "minimum altitude") * radians;
  const cosineHourAngle =
    (Math.sin(altitude) - Math.sin(lat) * Math.sin(dec)) /
    (Math.cos(lat) * Math.cos(dec));
  const aboveAltitudeHours =
    cosineHourAngle <= -1
      ? 24
      : cosineHourAngle >= 1
        ? 0
        : (2 * Math.acos(cosineHourAngle)) / (15 * radians);
  const usableHours = Math.min(
    aboveAltitudeHours,
    positive(input.darknessHours, "darkness"),
  );
  return {
    aboveAltitudeHours,
    usableHours,
    possibleExposures: Math.floor(
      (usableHours * 60) / positive(input.exposureMinutes, "exposure duration"),
    ),
    circumpolarAtAltitude: cosineHourAngle <= -1,
    neverReachesAltitude: cosineHourAngle >= 1,
  };
}

export function calculateAtmosphericExtinction(input: {
  altitudeDeg: number;
  extinctionMagPerAirmass: number;
  seaLevelPressureHpa: number;
  sitePressureHpa: number;
}) {
  const altitude = requireFiniteNumber(input.altitudeDeg, "altitude");
  if (altitude <= 0 || altitude > 90)
    throw new RangeError(
      "altitude must be above 0 and no more than 90 degrees",
    );
  const geometricAirmass =
    1 /
    Math.sin(((altitude + 244 / (165 + 47 * altitude ** 1.1)) * Math.PI) / 180);
  const airmass =
    (geometricAirmass * positive(input.sitePressureHpa, "site pressure")) /
    positive(input.seaLevelPressureHpa, "sea-level pressure");
  const extinctionMag =
    airmass * positive(input.extinctionMagPerAirmass, "extinction coefficient");
  return {
    airmass,
    extinctionMag,
    transmissionPercent: 100 * 10 ** (-0.4 * extinctionMag),
  };
}

export function calculateCalibrationFrames(input: {
  lightFrames: number;
  darkFrames: number;
  flatFrames: number;
  biasFrames: number;
  frameSizeMb: number;
  targetMasterNoisePercent: number;
}) {
  const lights = requirePositiveSafeInteger(input.lightFrames, "light frames");
  const counts = [input.darkFrames, input.flatFrames, input.biasFrames].map(
    (v, i) => requirePositiveSafeInteger(v, ["dark", "flat", "bias"][i]!),
  );
  const recommended = Math.ceil(
    1 /
      (positive(input.targetMasterNoisePercent, "master-noise target") / 100) **
        2,
  );
  return {
    recommendedFramesPerMaster: recommended,
    totalCalibrationFrames: counts.reduce((a, b) => a + b, 0),
    totalStorageGb:
      ((lights + counts.reduce((a, b) => a + b, 0)) *
        positive(input.frameSizeMb, "frame size")) /
      1024,
    darkMasterNoisePercent: 100 / Math.sqrt(counts[0]!),
    flatMasterNoisePercent: 100 / Math.sqrt(counts[1]!),
    biasMasterNoisePercent: 100 / Math.sqrt(counts[2]!),
  };
}

export function calculateDrizzlePlan(input: {
  widthPx: number;
  heightPx: number;
  drizzleFactor: number;
  frameCount: number;
  ditherPositions: number;
  bytesPerPixel: number;
}) {
  const width = requirePositiveSafeInteger(input.widthPx, "pixel width");
  const height = requirePositiveSafeInteger(input.heightPx, "pixel height");
  const factor = positive(input.drizzleFactor, "drizzle factor");
  const frames = requirePositiveSafeInteger(input.frameCount, "frame count");
  return {
    outputWidthPx: Math.ceil(width * factor),
    outputHeightPx: Math.ceil(height * factor),
    outputMegapixels: (width * height * factor * factor) / 1_000_000,
    workingSetGb:
      (width *
        height *
        factor *
        factor *
        positive(input.bytesPerPixel, "bytes per pixel") *
        4) /
      1024 ** 3,
    samplesPerOutputPixel:
      (frames * positive(input.ditherPositions, "dither positions")) /
      factor ** 2,
    adequatelySampled: frames * input.ditherPositions >= 4 * factor ** 2,
  };
}

export function calculateFieldRotation(input: {
  rotationRateDegPerHour: number;
  fieldRadiusDeg: number;
  imageScaleArcsecPerPx: number;
  allowedTrailPx: number;
  proposedExposureSeconds: number;
}) {
  const angularRate =
    positive(input.rotationRateDegPerHour, "rotation rate") / 3600;
  const radiusArcsec = positive(input.fieldRadiusDeg, "field radius") * 3600;
  const edgeMotionArcsecPerS = (radiusArcsec * angularRate * Math.PI) / 180;
  const allowedArcsec =
    positive(input.allowedTrailPx, "allowed trail") *
    positive(input.imageScaleArcsecPerPx, "image scale");
  const maximumExposureSeconds = allowedArcsec / edgeMotionArcsecPerS;
  const predictedTrailPx =
    (edgeMotionArcsecPerS *
      positive(input.proposedExposureSeconds, "proposed exposure")) /
    input.imageScaleArcsecPerPx;
  return {
    edgeMotionArcsecPerS,
    maximumExposureSeconds,
    predictedTrailPx,
    acceptable: predictedTrailPx <= input.allowedTrailPx,
  };
}

export function calculateAutofocusPlan(input: {
  focalRatio: number;
  wavelengthNm: number;
  focuserMicronsPerStep: number;
  samples: number;
  temperatureChangeC: number;
  expansionUmPerC: number;
}) {
  const criticalFocusZoneUm =
    2.2 *
    (positive(input.wavelengthNm, "wavelength") / 1000) *
    positive(input.focalRatio, "focal ratio") ** 2;
  const step = positive(input.focuserMicronsPerStep, "focuser step size");
  const samples = requirePositiveSafeInteger(input.samples, "sample count");
  const sampleSpacingSteps = Math.max(
    1,
    Math.round(criticalFocusZoneUm / 2 / step),
  );
  return {
    criticalFocusZoneUm,
    criticalFocusZoneSteps: criticalFocusZoneUm / step,
    sampleSpacingSteps,
    sweepSteps: sampleSpacingSteps * Math.max(0, samples - 1),
    temperatureCompensationSteps: Math.abs(
      (requireFiniteNumber(input.temperatureChangeC, "temperature change") *
        requireFiniteNumber(input.expansionUmPerC, "thermal coefficient")) /
        step,
    ),
  };
}
