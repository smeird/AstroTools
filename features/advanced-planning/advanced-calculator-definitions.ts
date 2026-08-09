import {
  calculateAtmosphericExtinction,
  calculateAutofocusPlan,
  calculateCalibrationFrames,
  calculateDrizzlePlan,
  calculateFieldRotation,
  calculateFilterAllocation,
  calculateGuidingExposure,
  calculateImagingWindow,
  calculateIntegrationPlan,
  calculateOptimalSubExposure,
  calculatePlateSolvingScale,
  calculateStarSaturation,
} from "@/lib/calculations";

export type AdvancedCalculatorKind =
  | "optimal-sub-exposure"
  | "integration-planner"
  | "filter-exposure-planner"
  | "star-saturation"
  | "guiding-exposure"
  | "plate-solving-scale"
  | "imaging-window"
  | "atmospheric-extinction"
  | "calibration-frames"
  | "drizzle-planner"
  | "field-rotation"
  | "autofocus-planning";

export interface AdvancedField {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly defaultValue: string;
  readonly min?: number;
  readonly max?: number;
  readonly shared?:
    "focalLengthMm" | "pixelSizeUm" | "widthPx" | "heightPx" | "focalRatio";
}

export interface AdvancedResult {
  readonly label: string;
  readonly value: number | boolean | string;
  readonly unit?: string;
  readonly digits?: number;
}

export interface AdvancedDefinition {
  readonly kind: AdvancedCalculatorKind;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly inputTitle: string;
  readonly resultTitle: string;
  readonly formulaLabel: string;
  readonly formulaWords: string;
  readonly note: string;
  readonly fields: readonly AdvancedField[];
  readonly calculate: (values: Record<string, number>) => AdvancedResult[];
}

const field = (
  key: string,
  label: string,
  unit: string,
  defaultValue: string,
  options: Pick<AdvancedField, "min" | "max" | "shared"> = {},
): AdvancedField => ({ key, label, unit, defaultValue, ...options });

export const advancedCalculatorDefinitions: Record<
  AdvancedCalculatorKind,
  AdvancedDefinition
> = {
  "optimal-sub-exposure": {
    kind: "optimal-sub-exposure",
    eyebrow: "Optimal sub-exposure",
    title: "Expose long enough—not longer than the sky allows.",
    lede: "Balance read-noise swamping against bright-star headroom to find a defensible sub-exposure range.",
    inputTitle: "Camera and measured sky",
    resultTitle: "Exposure envelope",
    formulaLabel: "Background-limited exposure",
    formulaWords:
      "Minimum time equals the selected sky-noise multiple times read-noise variance, divided by the combined sky and dark-current rate.",
    note: "A measured background electron rate is more reliable than a Bortle-only estimate. The recommendation is a planning bound, not a guarantee against saturation across the whole field.",
    fields: [
      field("readNoiseE", "Read noise", "e⁻", "1.5", { min: 0.01 }),
      field("skyRateEPerPixelS", "Measured sky rate", "e⁻/px/s", "0.2", {
        min: 0.000001,
      }),
      field("darkCurrentEPerPixelS", "Dark current", "e⁻/px/s", "0.01", {
        min: 0,
      }),
      field("skyNoiseMultiple", "Sky variance ÷ read variance", "×", "10", {
        min: 1,
      }),
      field("fullWellE", "Full-well capacity", "e⁻", "50000", { min: 1 }),
      field("brightStarRateEPerS", "Bright-star peak rate", "e⁻/s", "500", {
        min: 0.001,
      }),
      field("headroomPercent", "Saturation headroom", "%", "20", {
        min: 0.1,
        max: 99,
      }),
    ],
    calculate: (v) => {
      const r = calculateOptimalSubExposure(v as never);
      return [
        {
          label: "Minimum useful exposure",
          value: r.minimumSeconds,
          unit: "s",
        },
        {
          label: "Saturation ceiling",
          value: r.saturationLimitedSeconds,
          unit: "s",
        },
        {
          label: "Recommended sub-exposure",
          value: r.recommendedSeconds,
          unit: "s",
        },
        {
          label: "Current limiting factor",
          value: r.constrainedBySaturation
            ? "Star saturation"
            : "Background noise",
        },
      ];
    },
  },
  "integration-planner": {
    kind: "integration-planner",
    eyebrow: "Total integration planner",
    title: "Turn a depth target into a capture plan.",
    lede: "Convert desired accepted integration into frame counts, a rejection allowance and remaining time.",
    inputTitle: "Integration target",
    resultTitle: "Capture requirement",
    formulaLabel: "Stack signal-to-noise scaling",
    formulaWords:
      "For comparable calibrated frames, signal-to-noise improves with the square root of total accepted integration time.",
    note: "The square-root comparison assumes comparable sky, transparency, framing and calibration quality across the combined data.",
    fields: [
      field("totalHours", "Target integration", "h", "8", { min: 0.01 }),
      field("subExposureSeconds", "Sub-exposure", "s", "180", { min: 0.1 }),
      field("rejectionPercent", "Expected rejection", "%", "10", {
        min: 0,
        max: 99,
      }),
      field("currentIntegrationHours", "Already accepted", "h", "2", {
        min: 0,
      }),
    ],
    calculate: (v) => {
      const r = calculateIntegrationPlan(v as never);
      return [
        { label: "Accepted frames needed", value: r.acceptedFrames, digits: 0 },
        { label: "Frames to capture", value: r.captureFrames, digits: 0 },
        {
          label: "Rejection allowance",
          value: r.rejectedFramesAllowance,
          digits: 0,
        },
        { label: "Planned capture time", value: r.captureHours, unit: "h" },
        {
          label: "Remaining accepted time",
          value: r.remainingHours,
          unit: "h",
        },
        {
          label: "SNR relative to current stack",
          value: r.relativeSnrGain,
          unit: "×",
        },
      ];
    },
  },
  "filter-exposure-planner": {
    kind: "filter-exposure-planner",
    eyebrow: "Filter exposure planner",
    title: "Give every channel the time it needs.",
    lede: "Allocate a fixed session among three channels using scientific priority and relative transmission.",
    inputTitle: "Channels and throughput",
    resultTitle: "Three-channel allocation",
    formulaLabel: "Transmission-adjusted allocation",
    formulaWords:
      "Each channel receives time in proportion to its requested weight divided by its fractional transmission.",
    note: "Transmission is a useful first-order weighting term; target spectrum, sensor quantum efficiency, gradients and moonlight can justify a different allocation.",
    fields: [
      field("totalHours", "Total integration", "h", "9", { min: 0.01 }),
      field("channel1Weight", "Channel 1 priority", "weight", "1", {
        min: 0.01,
      }),
      field("channel2Weight", "Channel 2 priority", "weight", "1", {
        min: 0.01,
      }),
      field("channel3Weight", "Channel 3 priority", "weight", "1", {
        min: 0.01,
      }),
      field(
        "channel1TransmissionPercent",
        "Channel 1 transmission",
        "%",
        "90",
        { min: 0.1, max: 100 },
      ),
      field(
        "channel2TransmissionPercent",
        "Channel 2 transmission",
        "%",
        "70",
        { min: 0.1, max: 100 },
      ),
      field(
        "channel3TransmissionPercent",
        "Channel 3 transmission",
        "%",
        "80",
        { min: 0.1, max: 100 },
      ),
      field("subExposureSeconds", "Sub-exposure", "s", "300", { min: 0.1 }),
    ],
    calculate: (v) => {
      const r = calculateFilterAllocation(v as never);
      return r.channelHours.flatMap((hours, index) => [
        { label: `Channel ${index + 1} time`, value: hours, unit: "h" },
        {
          label: `Channel ${index + 1} frames`,
          value: r.channelFrames[index]!,
          digits: 0,
        },
      ]);
    },
  },
  "star-saturation": {
    kind: "star-saturation",
    eyebrow: "Star saturation",
    title: "Protect highlight detail before the well fills.",
    lede: "Compare a measured peak electron rate with the camera well, gain and chosen exposure.",
    inputTitle: "Sensor and bright-star measurement",
    resultTitle: "Highlight headroom",
    formulaLabel: "Pixel-well filling",
    formulaWords:
      "Peak electrons equal the measured peak electron rate multiplied by exposure time.",
    note: "Seeing, focus, guiding, filter choice and sub-pixel star position redistribute light, so validate the prediction with a representative test frame.",
    fields: [
      field("fullWellE", "Full-well capacity", "e⁻", "40000", { min: 1 }),
      field("gainEPerAdu", "System gain", "e⁻/ADU", "0.5", { min: 0.001 }),
      field("sourceRateEPerS", "Bright-star peak rate", "e⁻/s", "200", {
        min: 0.001,
      }),
      field("headroomPercent", "Reserved headroom", "%", "20", {
        min: 0,
        max: 99,
      }),
      field("exposureSeconds", "Proposed exposure", "s", "120", { min: 0.1 }),
    ],
    calculate: (v) => {
      const r = calculateStarSaturation(v as never);
      return [
        { label: "Usable well", value: r.usableWellE, unit: "e⁻" },
        {
          label: "Saturation-limited exposure",
          value: r.saturationSeconds,
          unit: "s",
        },
        {
          label: "Predicted peak electrons",
          value: r.predictedElectrons,
          unit: "e⁻",
        },
        { label: "Predicted peak ADU", value: r.predictedAdu, unit: "ADU" },
        { label: "Well used", value: r.wellPercent, unit: "%" },
        {
          label: "Headroom status",
          value: r.saturated ? "Exceeded" : "Available",
        },
      ];
    },
  },
  "guiding-exposure": {
    kind: "guiding-exposure",
    eyebrow: "Guiding exposure",
    title: "Measure the guide star before the mount moves on.",
    lede: "Solve the exposure needed for centroid SNR and compare it with the mount-motion ceiling.",
    inputTitle: "Guide signal and mount motion",
    resultTitle: "Guiding cadence",
    formulaLabel: "Guide-star signal-to-noise",
    formulaWords:
      "Guide-star signal grows with time while photon noise, sky noise and read noise determine the centroid measurement quality.",
    note: "The mount error rate is a local slope, not total periodic error. Multi-star guiding and seeing usually favour a cadence range rather than one exact value.",
    fields: [
      field("guideStarRateEPerS", "Guide-star signal rate", "e⁻/s", "500", {
        min: 0.001,
      }),
      field("skyRateEPerS", "Guide aperture sky rate", "e⁻/s", "20", {
        min: 0,
      }),
      field("readNoiseE", "Guide-camera read noise", "e⁻", "2", { min: 0.01 }),
      field("targetSnr", "Target guide-star SNR", "", "20", { min: 1 }),
      field("mountErrorArcsecPerS", "Local mount error rate", "″/s", "0.5", {
        min: 0.001,
      }),
      field("allowedMotionArcsec", "Allowed uncorrected motion", "″", "1", {
        min: 0.01,
      }),
    ],
    calculate: (v) => {
      const r = calculateGuidingExposure(v as never);
      return [
        { label: "SNR-limited minimum", value: r.minimumSeconds, unit: "s" },
        {
          label: "Motion-limited maximum",
          value: r.motionLimitedSeconds,
          unit: "s",
        },
        {
          label: "Recommended guide exposure",
          value: r.recommendedSeconds,
          unit: "s",
        },
        {
          label: "Requested SNR is feasible",
          value: r.feasible ? "Yes" : "No",
        },
      ];
    },
  },
  "plate-solving-scale": {
    kind: "plate-solving-scale",
    eyebrow: "Plate-solving scale",
    title: "Give the solver a trustworthy search envelope.",
    lede: "Derive image scale, field dimensions and bounded solver scale from the saved optical train.",
    inputTitle: "Optical scale and image dimensions",
    resultTitle: "Solver hints",
    formulaLabel: "Image scale",
    formulaWords:
      "Arcseconds per pixel equal 206.265 times pixel pitch in micrometres divided by focal length in millimetres.",
    note: "Use the actual solved or measured focal length when available; reducer spacing and focus position can shift the nominal scale.",
    fields: [
      field("focalLengthMm", "Effective focal length", "mm", "500", {
        min: 1,
        shared: "focalLengthMm",
      }),
      field("pixelSizeUm", "Effective pixel size", "µm", "3.76", {
        min: 0.01,
        shared: "pixelSizeUm",
      }),
      field("widthPx", "Image width", "px", "6248", {
        min: 1,
        shared: "widthPx",
      }),
      field("heightPx", "Image height", "px", "4176", {
        min: 1,
        shared: "heightPx",
      }),
      field("scaleTolerancePercent", "Search tolerance", "%", "10", {
        min: 0.1,
        max: 90,
      }),
    ],
    calculate: (v) => {
      const r = calculatePlateSolvingScale(v as never);
      return [
        { label: "Image scale", value: r.imageScaleArcsecPerPx, unit: "″/px" },
        { label: "Field width", value: r.fieldWidthDeg, unit: "°" },
        { label: "Field height", value: r.fieldHeightDeg, unit: "°" },
        {
          label: "Solver scale minimum",
          value: r.searchScaleMin,
          unit: "″/px",
        },
        {
          label: "Solver scale maximum",
          value: r.searchScaleMax,
          unit: "″/px",
        },
      ];
    },
  },
  "imaging-window": {
    kind: "imaging-window",
    eyebrow: "Imaging window",
    title: "Find the usable part of the night.",
    lede: "Intersect target altitude time with astronomical darkness and the intended exposure cadence.",
    inputTitle: "Site, target and darkness",
    resultTitle: "Usable window",
    formulaLabel: "Altitude hour angle",
    formulaWords:
      "The altitude limit determines a symmetric hour-angle interval from site latitude and target declination.",
    note: "This geometric planner does not yet model a specific date, horizon profile, Moon separation, weather or meridian-flip downtime.",
    fields: [
      field("latitudeDeg", "Site latitude", "°", "52", { min: -90, max: 90 }),
      field("declinationDeg", "Target declination", "°", "30", {
        min: -90,
        max: 90,
      }),
      field("minimumAltitudeDeg", "Minimum target altitude", "°", "30", {
        min: -10,
        max: 90,
      }),
      field("darknessHours", "Astronomical darkness", "h", "8", {
        min: 0.01,
        max: 24,
      }),
      field("exposureMinutes", "Exposure block", "min", "5", { min: 0.01 }),
    ],
    calculate: (v) => {
      const r = calculateImagingWindow(v as never);
      return [
        {
          label: "Above altitude limit",
          value: r.aboveAltitudeHours,
          unit: "h",
        },
        { label: "Usable dark window", value: r.usableHours, unit: "h" },
        {
          label: "Complete exposure blocks",
          value: r.possibleExposures,
          digits: 0,
        },
        {
          label: "Target geometry",
          value: r.neverReachesAltitude
            ? "Never reaches limit"
            : r.circumpolarAtAltitude
              ? "Always above limit"
              : "Rises and sets through limit",
        },
      ];
    },
  },
  "atmospheric-extinction": {
    kind: "atmospheric-extinction",
    eyebrow: "Atmospheric extinction",
    title: "Quantify the cost of imaging low.",
    lede: "Estimate pressure-adjusted airmass, magnitude loss and remaining transmission at a target altitude.",
    inputTitle: "Altitude and atmosphere",
    resultTitle: "Atmospheric loss",
    formulaLabel: "Extinction through airmass",
    formulaWords:
      "Magnitude loss equals the local extinction coefficient multiplied by pressure-adjusted optical airmass.",
    note: "The extinction coefficient varies with wavelength, aerosols, humidity and transparency. Use a locally measured coefficient for photometric work.",
    fields: [
      field("altitudeDeg", "Target altitude", "°", "45", { min: 0.1, max: 90 }),
      field(
        "extinctionMagPerAirmass",
        "Extinction coefficient",
        "mag/airmass",
        "0.2",
        { min: 0.001 },
      ),
      field("seaLevelPressureHpa", "Reference pressure", "hPa", "1013.25", {
        min: 1,
      }),
      field("sitePressureHpa", "Site pressure", "hPa", "950", { min: 1 }),
    ],
    calculate: (v) => {
      const r = calculateAtmosphericExtinction(v as never);
      return [
        { label: "Pressure-adjusted airmass", value: r.airmass },
        { label: "Extinction", value: r.extinctionMag, unit: "mag" },
        {
          label: "Remaining transmission",
          value: r.transmissionPercent,
          unit: "%",
        },
      ];
    },
  },
  "calibration-frames": {
    kind: "calibration-frames",
    eyebrow: "Calibration-frame planner",
    title: "Budget the calibration library with the lights.",
    lede: "Estimate master-frame noise reduction, calibration counts and total storage demand.",
    inputTitle: "Lights, masters and storage",
    resultTitle: "Calibration plan",
    formulaLabel: "Master-frame noise reduction",
    formulaWords:
      "Independent random noise in a combined master falls in proportion to one divided by the square root of the frame count.",
    note: "This count model covers random noise only. Flats still need appropriate illumination and ADU, while darks must match temperature, exposure, gain and sensor mode.",
    fields: [
      field("lightFrames", "Light frames", "frames", "100", { min: 1 }),
      field("darkFrames", "Dark frames", "frames", "25", { min: 1 }),
      field("flatFrames", "Flat frames", "frames", "25", { min: 1 }),
      field("biasFrames", "Bias/dark-flat frames", "frames", "25", { min: 1 }),
      field("frameSizeMb", "Size per frame", "MB", "50", { min: 0.01 }),
      field(
        "targetMasterNoisePercent",
        "Target relative master noise",
        "%",
        "20",
        { min: 0.1 },
      ),
    ],
    calculate: (v) => {
      const r = calculateCalibrationFrames(v as never);
      return [
        {
          label: "Frames recommended per master",
          value: r.recommendedFramesPerMaster,
          digits: 0,
        },
        {
          label: "Calibration frames planned",
          value: r.totalCalibrationFrames,
          digits: 0,
        },
        { label: "Session storage", value: r.totalStorageGb, unit: "GiB" },
        {
          label: "Dark master random noise",
          value: r.darkMasterNoisePercent,
          unit: "%",
        },
        {
          label: "Flat master random noise",
          value: r.flatMasterNoisePercent,
          unit: "%",
        },
        {
          label: "Bias master random noise",
          value: r.biasMasterNoisePercent,
          unit: "%",
        },
      ];
    },
  },
  "drizzle-planner": {
    kind: "drizzle-planner",
    eyebrow: "Drizzle and resampling",
    title: "Spend pixels only when the data supports them.",
    lede: "Forecast drizzle dimensions, working memory and sampling support from frames and dither diversity.",
    inputTitle: "Stack dimensions and sampling",
    resultTitle: "Drizzle workload",
    formulaLabel: "Drizzle output area",
    formulaWords:
      "Output width and height grow by the drizzle factor, so pixel count and memory grow with its square.",
    note: "Adequate sampling is a planning heuristic. Dither distribution, drop shrink, rejection and native optical sampling determine whether drizzle adds real detail.",
    fields: [
      field("widthPx", "Native width", "px", "6248", {
        min: 1,
        shared: "widthPx",
      }),
      field("heightPx", "Native height", "px", "4176", {
        min: 1,
        shared: "heightPx",
      }),
      field("drizzleFactor", "Drizzle factor", "×", "2", { min: 1, max: 4 }),
      field("frameCount", "Accepted frames", "frames", "40", { min: 1 }),
      field("ditherPositions", "Distinct dither positions", "positions", "4", {
        min: 1,
      }),
      field("bytesPerPixel", "Working bytes per pixel", "B", "4", { min: 1 }),
    ],
    calculate: (v) => {
      const r = calculateDrizzlePlan(v as never);
      return [
        {
          label: "Output width",
          value: r.outputWidthPx,
          unit: "px",
          digits: 0,
        },
        {
          label: "Output height",
          value: r.outputHeightPx,
          unit: "px",
          digits: 0,
        },
        { label: "Output size", value: r.outputMegapixels, unit: "MP" },
        { label: "Estimated working set", value: r.workingSetGb, unit: "GiB" },
        { label: "Samples per output pixel", value: r.samplesPerOutputPixel },
        {
          label: "Sampling heuristic",
          value: r.adequatelySampled
            ? "Supported"
            : "More frames/dithers advised",
        },
      ];
    },
  },
  "field-rotation": {
    kind: "field-rotation",
    eyebrow: "Alt-az field rotation",
    title: "Keep the field from turning during the exposure.",
    lede: "Translate a local field-rotation rate into edge motion and a sub-exposure ceiling.",
    inputTitle: "Rotation, field and sampling",
    resultTitle: "Rotation limit",
    formulaLabel: "Edge motion from field rotation",
    formulaWords:
      "Linear angular motion at the field edge equals field radius multiplied by rotation angle in radians.",
    note: "Rotation rate changes continuously with target position and is fastest in difficult sky regions. Use the worst rate across the proposed exposure or a derotator.",
    fields: [
      field("rotationRateDegPerHour", "Local rotation rate", "°/h", "10", {
        min: 0.001,
      }),
      field("fieldRadiusDeg", "Field radius", "°", "1", { min: 0.001 }),
      field("imageScaleArcsecPerPx", "Image scale", "″/px", "1.5", {
        min: 0.001,
      }),
      field("allowedTrailPx", "Allowed edge trail", "px", "1", { min: 0.01 }),
      field("proposedExposureSeconds", "Proposed exposure", "s", "30", {
        min: 0.01,
      }),
    ],
    calculate: (v) => {
      const r = calculateFieldRotation(v as never);
      return [
        {
          label: "Edge motion rate",
          value: r.edgeMotionArcsecPerS,
          unit: "″/s",
          digits: 4,
        },
        {
          label: "Maximum exposure",
          value: r.maximumExposureSeconds,
          unit: "s",
        },
        {
          label: "Predicted edge trail",
          value: r.predictedTrailPx,
          unit: "px",
        },
        {
          label: "Proposed exposure",
          value: r.acceptable ? "Within limit" : "Exceeds limit",
        },
      ];
    },
  },
  "autofocus-planning": {
    kind: "autofocus-planning",
    eyebrow: "Autofocus planning",
    title: "Sample focus finely enough to find the curve.",
    lede: "Relate focal ratio, wavelength and focuser mechanics to the critical focus zone and autofocus sweep.",
    inputTitle: "Optics and focuser",
    resultTitle: "Focus run",
    formulaLabel: "Critical focus zone",
    formulaWords:
      "The approximate critical focus zone equals 2.2 times wavelength times the square of focal ratio.",
    note: "The diffraction expression is a starting point. Seeing, filter offsets, backlash, mirror motion and the focuser algorithm may require a wider sweep or different step spacing.",
    fields: [
      field("focalRatio", "Effective focal ratio", "f/", "5", {
        min: 0.1,
        shared: "focalRatio",
      }),
      field("wavelengthNm", "Reference wavelength", "nm", "550", { min: 100 }),
      field(
        "focuserMicronsPerStep",
        "Focuser travel per step",
        "µm/step",
        "1",
        { min: 0.001 },
      ),
      field("samples", "Focus samples", "points", "9", { min: 3 }),
      field("temperatureChangeC", "Temperature change", "°C", "4"),
      field("expansionUmPerC", "Measured focus shift", "µm/°C", "5"),
    ],
    calculate: (v) => {
      const r = calculateAutofocusPlan(v as never);
      return [
        {
          label: "Critical focus zone",
          value: r.criticalFocusZoneUm,
          unit: "µm",
        },
        {
          label: "Critical focus zone steps",
          value: r.criticalFocusZoneSteps,
          unit: "steps",
        },
        {
          label: "Suggested sample spacing",
          value: r.sampleSpacingSteps,
          unit: "steps",
          digits: 0,
        },
        { label: "Total sweep", value: r.sweepSteps, unit: "steps", digits: 0 },
        {
          label: "Temperature compensation",
          value: r.temperatureCompensationSteps,
          unit: "steps",
        },
      ];
    },
  },
};
