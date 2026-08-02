export type CalculatorGroup =
  | "Optics & framing"
  | "Image quality"
  | "Acquisition"
  | "Mount & guiding"
  | "Sky & environment"
  | "Session planning";

export type CalculatorIcon =
  | "optics"
  | "sensor"
  | "exposure"
  | "mount"
  | "sky"
  | "session"
  | "formula"
  | "focus";

export interface QuantityReference {
  readonly name: string;
  readonly symbol?: string;
  readonly unit?: string;
}

export interface CalculatorReference {
  readonly slug: string;
  readonly name: string;
  readonly group: CalculatorGroup;
  readonly icon: CalculatorIcon;
  readonly summary: string;
  readonly question: string;
  readonly formula: string;
  readonly formulaWords: string;
  readonly confidence:
    "Exact geometry" | "Measured model" | "Planning estimate" | "Heuristic";
  readonly inputs: readonly string[];
  readonly inputSources: readonly string[];
  readonly outputs: readonly QuantityReference[];
  readonly keywords: readonly string[];
  readonly related: readonly string[];
}

const ref = (value: CalculatorReference) => value;

export const calculatorRegistry: readonly CalculatorReference[] = [
  ref({
    slug: "field-of-view",
    name: "Field of View",
    group: "Optics & framing",
    icon: "optics",
    summary: "Frame a target and calculate the exact angular sensor field.",
    question: "Will this target fit in my camera?",
    formula: "θ = 2 atan(d ÷ 2f)",
    formulaWords:
      "Angular field is set by sensor dimension and effective focal length.",
    confidence: "Exact geometry",
    inputs: ["Focal length", "Sensor dimensions", "Target extent"],
    inputSources: [
      "Equipment profile",
      "Manufacturer specification",
      "Astronomical catalogue",
    ],
    outputs: [
      { name: "Horizontal field", symbol: "θₕ", unit: "degrees" },
      { name: "Vertical field", symbol: "θᵥ", unit: "degrees" },
      { name: "Pixel scale", symbol: "s", unit: "arcsec/pixel" },
    ],
    keywords: ["fov", "framing", "target fit", "field size"],
    related: [
      "mosaic-planning",
      "plate-solving-scale",
      "resolution-and-sampling",
    ],
  }),
  ref({
    slug: "modifier-effects",
    name: "Reducer & Barlow",
    group: "Optics & framing",
    icon: "optics",
    summary:
      "Calculate how an ordered modifier train changes focal length and focal ratio.",
    question: "What does this reducer or Barlow do to my telescope?",
    formula: "f = f₀ × ∏m",
    formulaWords:
      "Multiply native focal length by every optical multiplier in path order.",
    confidence: "Exact geometry",
    inputs: ["Native focal length", "Aperture", "Modifier multipliers"],
    inputSources: ["Equipment profile", "Manufacturer spacing specification"],
    outputs: [
      { name: "Effective focal length", symbol: "f", unit: "mm" },
      { name: "Effective focal ratio", symbol: "N", unit: "f/" },
    ],
    keywords: ["reducer", "barlow", "flattener", "focal ratio"],
    related: ["field-of-view", "backfocus-spacing", "resolution-and-sampling"],
  }),
  ref({
    slug: "resolution-and-sampling",
    name: "Resolution & Sampling",
    group: "Image quality",
    icon: "sensor",
    summary: "Compare diffraction, seeing and camera sampling.",
    question: "Am I over- or under-sampled?",
    formula: "s = 206.265p ÷ f",
    formulaWords:
      "Pixel scale is pixel pitch divided by focal length using the angular conversion constant.",
    confidence: "Exact geometry",
    inputs: ["Effective focal length", "Aperture", "Pixel pitch", "Seeing"],
    inputSources: [
      "Equipment profile",
      "Camera specification",
      "Local seeing estimate",
    ],
    outputs: [
      { name: "Pixel scale", symbol: "s", unit: "arcsec/pixel" },
      { name: "Airy disc", symbol: "θA", unit: "arcsec" },
      { name: "Pixels per seeing FWHM", unit: "pixels" },
    ],
    keywords: [
      "pixel scale",
      "sampling",
      "airy",
      "seeing",
      "arcseconds per pixel",
    ],
    related: ["field-of-view", "drizzle-planner", "plate-solving-scale"],
  }),
  ref({
    slug: "sensor-tilt",
    name: "Sensor Tilt",
    group: "Image quality",
    icon: "sensor",
    summary: "Translate focus differences across a sensor into plane tilt.",
    question: "How much is my sensor tilted?",
    formula: "α = atan(Δz ÷ d)",
    formulaWords:
      "Tilt angle comes from focus offset across a known sensor distance.",
    confidence: "Measured model",
    inputs: ["Focus differences", "Sensor dimensions"],
    inputSources: [
      "Aberration inspector or autofocus measurements",
      "Equipment profile",
    ],
    outputs: [
      { name: "Combined plane tilt", symbol: "α", unit: "degrees" },
      { name: "Corner focus spread", unit: "µm" },
    ],
    keywords: ["tilt", "focus plane", "corner stars"],
    related: [
      "autofocus-planning",
      "backfocus-spacing",
      "resolution-and-sampling",
    ],
  }),
  ref({
    slug: "backfocus-spacing",
    name: "Back-focus Spacing",
    group: "Optics & framing",
    icon: "optics",
    summary:
      "Balance adapters, filters and camera depth against required back-focus.",
    question: "Which spacer thickness do I need?",
    formula: "e = Bᵣₑq − Σdᵢ",
    formulaWords:
      "Required spacer equals specified back-focus minus installed component depth.",
    confidence: "Exact geometry",
    inputs: ["Required back-focus", "Component depths", "Filter correction"],
    inputSources: [
      "Reducer/flattener manual",
      "Adapter drawings",
      "Camera mechanical drawing",
    ],
    outputs: [
      { name: "Spacer required", symbol: "e", unit: "mm" },
      { name: "Back-focus error", unit: "mm" },
    ],
    keywords: ["spacing", "spacer", "flange", "filter thickness"],
    related: ["modifier-effects", "sensor-tilt", "autofocus-planning"],
  }),
  ref({
    slug: "guiding-ratio",
    name: "Guiding Ratio",
    group: "Mount & guiding",
    icon: "mount",
    summary: "Compare guide-camera and imaging-camera angular scales.",
    question: "Is my guide setup sufficiently precise?",
    formula: "q = sguide ÷ simage",
    formulaWords:
      "Guiding ratio compares angular sampling in the guide and imaging systems.",
    confidence: "Exact geometry",
    inputs: ["Imaging train", "Guide focal length", "Guide pixel pitch"],
    inputSources: [
      "Equipment profile",
      "Guide-scope and guide-camera specifications",
    ],
    outputs: [
      { name: "Guiding ratio", symbol: "q", unit: "ratio" },
      { name: "Guide image scale", unit: "arcsec/pixel" },
    ],
    keywords: ["guide ratio", "guidescope", "OAG", "guide scale"],
    related: ["guiding-exposure", "polar-alignment-drift", "field-rotation"],
  }),
  ref({
    slug: "polar-alignment-drift",
    name: "Polar Alignment",
    group: "Mount & guiding",
    icon: "mount",
    summary: "Estimate polar-axis error from measured stellar drift.",
    question: "How far out is my polar alignment?",
    formula: "ε ≈ drift ÷ (15t cos δ)",
    formulaWords:
      "Measured drift over time estimates the corresponding polar-axis error.",
    confidence: "Measured model",
    inputs: ["Measured drift", "Elapsed time", "Target declination"],
    inputSources: [
      "Guiding log or reticle measurement",
      "Plate-solved target coordinates",
    ],
    outputs: [
      { name: "Polar alignment error", symbol: "ε", unit: "arcmin" },
      { name: "Drift rate", unit: "arcsec/min" },
    ],
    keywords: ["polar error", "drift alignment", "azimuth", "altitude"],
    related: ["guiding-ratio", "guiding-exposure", "field-rotation"],
  }),
  ref({
    slug: "exposure-snr",
    name: "Exposure & SNR",
    group: "Acquisition",
    icon: "exposure",
    summary: "Estimate calibrated signal-to-noise for a stack.",
    question: "What SNR will this imaging plan produce?",
    formula: "SNR = St ÷ √(St + Bt + Dt + nR²)",
    formulaWords:
      "Signal is divided by the quadrature sum of photon, dark and read noise.",
    confidence: "Measured model",
    inputs: ["Source rate", "Sky rate", "Dark current", "Read noise", "Frames"],
    inputSources: [
      "Calibrated test exposure",
      "Camera specification or sensor analysis",
      "Capture plan",
    ],
    outputs: [
      { name: "Stack signal-to-noise", symbol: "SNR" },
      { name: "Single-frame SNR" },
      { name: "Sky/read variance ratio" },
    ],
    keywords: ["snr", "noise", "stack", "photons"],
    related: [
      "optimal-sub-exposure",
      "integration-planner",
      "filter-exposure-planner",
    ],
  }),
  ref({
    slug: "optimal-sub-exposure",
    name: "Optimal Sub-exposure",
    group: "Acquisition",
    icon: "exposure",
    summary: "Balance read-noise swamping against highlight saturation.",
    question: "How long should each subframe be?",
    formula: "tmin = kR² ÷ (Ssky + D)",
    formulaWords:
      "Expose until background variance sufficiently exceeds read-noise variance, subject to saturation.",
    confidence: "Measured model",
    inputs: [
      "Read noise",
      "Measured sky rate",
      "Dark current",
      "Full well",
      "Bright-star rate",
    ],
    inputSources: [
      "Camera sensor analysis",
      "Calibrated test exposure",
      "Bright-star pixel measurement",
    ],
    outputs: [
      { name: "Minimum useful exposure", symbol: "tmin", unit: "seconds" },
      { name: "Saturation ceiling", symbol: "tsat", unit: "seconds" },
      { name: "Recommended sub-exposure", unit: "seconds" },
    ],
    keywords: [
      "subframe",
      "subs",
      "sub exposure",
      "exposure length",
      "sky limited",
    ],
    related: ["exposure-snr", "star-saturation", "integration-planner"],
  }),
  ref({
    slug: "integration-planner",
    name: "Integration Planner",
    group: "Acquisition",
    icon: "exposure",
    summary:
      "Turn a desired accepted integration into a capture count and rejection allowance.",
    question: "How many frames must I capture?",
    formula: "SNR ∝ √T",
    formulaWords:
      "Comparable-frame SNR improves with the square root of accepted integration.",
    confidence: "Planning estimate",
    inputs: [
      "Target integration",
      "Sub-exposure",
      "Rejection rate",
      "Existing integration",
    ],
    inputSources: [
      "Imaging goal",
      "Sub-exposure calculator",
      "Previous session statistics",
    ],
    outputs: [
      { name: "Frames to capture" },
      { name: "Remaining integration", unit: "hours" },
      { name: "Relative SNR gain" },
    ],
    keywords: ["total time", "frame count", "integration", "rejection"],
    related: ["optimal-sub-exposure", "exposure-snr", "storage-volume"],
  }),
  ref({
    slug: "filter-exposure-planner",
    name: "Filter Exposure Planner",
    group: "Acquisition",
    icon: "exposure",
    summary:
      "Allocate integration among three filters using priority and throughput.",
    question: "How should I divide time between filters?",
    formula: "Ti = T(wi ÷ ηi) ÷ Σ(w ÷ η)",
    formulaWords:
      "Lower-throughput or higher-priority channels receive more of the fixed time budget.",
    confidence: "Planning estimate",
    inputs: [
      "Total time",
      "Channel priorities",
      "Relative transmissions",
      "Sub-exposure",
    ],
    inputSources: [
      "Project priorities",
      "Filter transmission curves",
      "Manufacturer data or measured throughput",
    ],
    outputs: [
      { name: "Channel integration", unit: "hours" },
      { name: "Channel frame count" },
    ],
    keywords: [
      "LRGB",
      "SHO",
      "narrowband",
      "filter time",
      "channel allocation",
    ],
    related: ["exposure-snr", "integration-planner", "atmospheric-extinction"],
  }),
  ref({
    slug: "star-saturation",
    name: "Star Saturation",
    group: "Acquisition",
    icon: "sensor",
    summary: "Predict when a bright-star pixel reaches usable full well.",
    question: "Will bright stars saturate in this exposure?",
    formula: "tsat = W(1 − h) ÷ F★",
    formulaWords:
      "Usable well capacity divided by peak electron rate sets the saturation time.",
    confidence: "Measured model",
    inputs: [
      "Full well",
      "System gain",
      "Peak electron rate",
      "Headroom",
      "Exposure",
    ],
    inputSources: [
      "Camera sensor analysis",
      "Linear test exposure",
      "Capture setting",
    ],
    outputs: [
      { name: "Saturation-limited exposure", unit: "seconds" },
      { name: "Well used", unit: "percent" },
      { name: "Predicted peak", unit: "ADU" },
    ],
    keywords: ["clipping", "full well", "highlights", "adu"],
    related: [
      "optimal-sub-exposure",
      "exposure-snr",
      "filter-exposure-planner",
    ],
  }),
  ref({
    slug: "guiding-exposure",
    name: "Guiding Exposure",
    group: "Mount & guiding",
    icon: "mount",
    summary:
      "Find a guide exposure that measures the star before mount motion becomes excessive.",
    question: "How long should my guide-camera exposure be?",
    formula: "SNR = Ft ÷ √((F+B)t + R²)",
    formulaWords:
      "The guide star must reach centroid SNR before the motion-limited cadence expires.",
    confidence: "Measured model",
    inputs: [
      "Guide-star rate",
      "Guide sky rate",
      "Read noise",
      "Mount error rate",
    ],
    inputSources: [
      "Guiding software star profile",
      "Guide-camera specification",
      "Guiding log",
    ],
    outputs: [
      { name: "Recommended guide exposure", unit: "seconds" },
      { name: "Motion-limited maximum", unit: "seconds" },
    ],
    keywords: ["guide cadence", "guide exposure", "centroid", "PHD2"],
    related: ["guiding-ratio", "polar-alignment-drift", "field-rotation"],
  }),
  ref({
    slug: "plate-solving-scale",
    name: "Plate-solving Scale",
    group: "Optics & framing",
    icon: "formula",
    summary:
      "Derive solver scale bounds and sensor field from the imaging train.",
    question: "What scale should I give my plate solver?",
    formula: "s = 206.265p ÷ f",
    formulaWords:
      "Focal length and effective pixel pitch determine the expected solver scale.",
    confidence: "Exact geometry",
    inputs: ["Focal length", "Pixel pitch", "Image dimensions", "Tolerance"],
    inputSources: [
      "Equipment profile",
      "Binned image dimensions",
      "Solved focal-length refinement",
    ],
    outputs: [
      { name: "Pixel scale", symbol: "s", unit: "arcsec/pixel" },
      { name: "Solver scale range", unit: "arcsec/pixel" },
      { name: "Image field", unit: "degrees" },
    ],
    keywords: ["ASTAP", "solver", "platesolve", "arcsec pixel", "search scale"],
    related: ["field-of-view", "resolution-and-sampling", "imaging-window"],
  }),
  ref({
    slug: "imaging-window",
    name: "Imaging Window",
    group: "Sky & environment",
    icon: "sky",
    summary: "Intersect a target altitude interval with available darkness.",
    question: "How long can I image this target tonight?",
    formula: "cos H = (sin a − sin φ sin δ) ÷ (cos φ cos δ)",
    formulaWords:
      "Latitude, declination and altitude limit determine the geometric hour-angle window.",
    confidence: "Planning estimate",
    inputs: ["Latitude", "Declination", "Altitude limit", "Darkness"],
    inputSources: [
      "Site coordinates",
      "Target catalogue",
      "Astronomical twilight planner",
    ],
    outputs: [
      { name: "Usable imaging window", unit: "hours" },
      { name: "Time above altitude", unit: "hours" },
    ],
    keywords: [
      "visibility",
      "altitude",
      "declination",
      "darkness",
      "target window",
    ],
    related: ["atmospheric-extinction", "field-rotation", "mosaic-planning"],
  }),
  ref({
    slug: "atmospheric-extinction",
    name: "Atmospheric Extinction",
    group: "Sky & environment",
    icon: "sky",
    summary: "Estimate pressure-adjusted airmass and transmission loss.",
    question: "How much signal will the atmosphere remove?",
    formula: "Δm = kX",
    formulaWords:
      "Magnitude loss is the local extinction coefficient multiplied by optical airmass.",
    confidence: "Planning estimate",
    inputs: ["Target altitude", "Extinction coefficient", "Site pressure"],
    inputSources: [
      "Planetarium altitude",
      "Local photometric measurement",
      "Weather station",
    ],
    outputs: [
      { name: "Airmass", symbol: "X" },
      { name: "Atmospheric extinction", symbol: "Δm", unit: "magnitudes" },
      { name: "Transmission", unit: "percent" },
    ],
    keywords: ["airmass", "transparency", "altitude", "magnitude loss"],
    related: ["imaging-window", "filter-exposure-planner", "exposure-snr"],
  }),
  ref({
    slug: "mosaic-planning",
    name: "Mosaic Planning",
    group: "Optics & framing",
    icon: "optics",
    summary: "Tile a target extent with controlled field overlap.",
    question: "How many panels does this mosaic need?",
    formula: "n = ceil((target − overlap) ÷ step)",
    formulaWords:
      "Panel steps equal the usable field after overlap is reserved.",
    confidence: "Exact geometry",
    inputs: ["Imaging train", "Target extent", "Overlap", "Panel integration"],
    inputSources: [
      "Equipment profile",
      "Astronomical catalogue",
      "Registration preference",
    ],
    outputs: [
      { name: "Mosaic panel count" },
      { name: "Mosaic grid" },
      { name: "Total mosaic integration", unit: "hours" },
    ],
    keywords: ["panels", "overlap", "tile", "large target"],
    related: ["field-of-view", "integration-planner", "storage-volume"],
  }),
  ref({
    slug: "calibration-frames",
    name: "Calibration Frames",
    group: "Session planning",
    icon: "session",
    summary: "Plan master-frame noise, counts and storage.",
    question: "How many darks, flats and bias frames do I need?",
    formula: "σmaster = σ1 ÷ √N",
    formulaWords:
      "Independent random noise falls with the square root of combined frame count.",
    confidence: "Heuristic",
    inputs: [
      "Light count",
      "Dark/flat/bias counts",
      "Frame size",
      "Noise target",
    ],
    inputSources: [
      "Capture plan",
      "Camera file size",
      "Desired master quality",
    ],
    outputs: [
      { name: "Calibration frame count" },
      { name: "Master random noise", unit: "percent" },
      { name: "Calibration storage", unit: "GiB" },
    ],
    keywords: ["darks", "flats", "bias", "dark flats", "master frames"],
    related: ["storage-volume", "integration-planner", "exposure-snr"],
  }),
  ref({
    slug: "drizzle-planner",
    name: "Drizzle Planner",
    group: "Image quality",
    icon: "sensor",
    summary: "Forecast drizzle output size, memory and sampling support.",
    question: "Should I use 2× or 3× drizzle?",
    formula: "Nout = Nin × d²",
    formulaWords:
      "Linear dimensions grow by drizzle factor and pixel area grows by its square.",
    confidence: "Heuristic",
    inputs: [
      "Image dimensions",
      "Drizzle factor",
      "Frames",
      "Dither positions",
    ],
    inputSources: [
      "Equipment profile",
      "Accepted stack",
      "Acquisition dither history",
    ],
    outputs: [
      { name: "Drizzle output dimensions", unit: "pixels" },
      { name: "Drizzle working memory", unit: "GiB" },
      { name: "Samples per output pixel" },
    ],
    keywords: ["resample", "dither", "2x drizzle", "undersampling", "memory"],
    related: [
      "resolution-and-sampling",
      "storage-volume",
      "integration-planner",
    ],
  }),
  ref({
    slug: "field-rotation",
    name: "Field Rotation",
    group: "Mount & guiding",
    icon: "mount",
    summary:
      "Convert an alt-az field-rotation rate into edge trailing and exposure limits.",
    question: "How long can I expose on an alt-az mount?",
    formula: "Δsedge = rθ",
    formulaWords:
      "Stars at the field edge move by field radius multiplied by rotation angle.",
    confidence: "Planning estimate",
    inputs: ["Rotation rate", "Field radius", "Pixel scale", "Trail tolerance"],
    inputSources: [
      "Mount/planetarium rotation rate",
      "Field-of-view result",
      "Equipment profile",
    ],
    outputs: [
      { name: "Field-rotation exposure limit", unit: "seconds" },
      { name: "Edge trail", unit: "pixels" },
    ],
    keywords: ["alt az", "derotator", "rotation", "edge trails"],
    related: ["imaging-window", "guiding-exposure", "field-of-view"],
  }),
  ref({
    slug: "autofocus-planning",
    name: "Autofocus Planning",
    group: "Image quality",
    icon: "focus",
    summary: "Relate optical depth of focus to focuser steps and sweep size.",
    question: "What autofocus step size and range should I use?",
    formula: "CFZ ≈ 2.2λN²",
    formulaWords:
      "Critical focus zone grows with wavelength and the square of focal ratio.",
    confidence: "Planning estimate",
    inputs: [
      "Focal ratio",
      "Wavelength",
      "Focuser travel per step",
      "Samples",
      "Thermal shift",
    ],
    inputSources: [
      "Equipment profile",
      "Focuser specification or dial measurement",
      "Focus log temperature trend",
    ],
    outputs: [
      { name: "Critical focus zone", symbol: "CFZ", unit: "µm" },
      { name: "Autofocus step spacing", unit: "steps" },
      { name: "Autofocus sweep", unit: "steps" },
    ],
    keywords: ["cfz", "focus steps", "v curve", "temperature compensation"],
    related: ["sensor-tilt", "backfocus-spacing", "resolution-and-sampling"],
  }),
  ref({
    slug: "dew-heater",
    name: "Dew & Heater",
    group: "Sky & environment",
    icon: "sky",
    summary: "Estimate dew point, optic margin and heater demand.",
    question: "How much dew-heater power do I need?",
    formula: "P ≈ hAΔT ÷ η",
    formulaWords:
      "First-order heater power offsets heat loss at the desired temperature margin.",
    confidence: "Planning estimate",
    inputs: [
      "Temperature",
      "Humidity",
      "Optic diameter",
      "Heater geometry",
      "Voltage",
    ],
    inputSources: [
      "Weather sensor",
      "Equipment profile",
      "Heater-band specification",
    ],
    outputs: [
      { name: "Dew point", unit: "°C" },
      { name: "Heater power", unit: "W" },
      { name: "Heater current", unit: "A" },
    ],
    keywords: ["humidity", "dew point", "heater power", "condensation"],
    related: ["imaging-window", "atmospheric-extinction", "storage-volume"],
  }),
  ref({
    slug: "storage-volume",
    name: "Storage Volume",
    group: "Session planning",
    icon: "session",
    summary: "Convert sensor format and cadence into a session data budget.",
    question: "How much disk space will tonight require?",
    formula: "V = width × height × bits × frames",
    formulaWords:
      "Per-frame pixel payload accumulates across lights and calibration frames.",
    confidence: "Planning estimate",
    inputs: [
      "Image dimensions",
      "Bit depth",
      "Exposure cadence",
      "Session length",
      "Calibration count",
    ],
    inputSources: ["Equipment profile", "Capture format", "Session plan"],
    outputs: [
      { name: "Frame size", unit: "MiB" },
      { name: "Session storage", unit: "GiB" },
      { name: "Sustained write rate", unit: "MiB/s" },
    ],
    keywords: ["disk", "file size", "data", "capacity", "write speed"],
    related: ["calibration-frames", "drizzle-planner", "integration-planner"],
  }),
];

export const calculatorGroups: readonly CalculatorGroup[] = [
  "Optics & framing",
  "Image quality",
  "Acquisition",
  "Mount & guiding",
  "Sky & environment",
  "Session planning",
];

export function calculatorBySlug(slug: string) {
  return calculatorRegistry.find((calculator) => calculator.slug === slug);
}

export function searchCalculators(query: string) {
  const normalizedQuery = query
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9µ²×]+/g, " ")
    .trim();
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "how",
    "what",
    "which",
    "is",
    "are",
    "do",
    "does",
    "i",
    "my",
    "should",
    "each",
    "be",
    "to",
    "of",
  ]);
  const terms = normalizedQuery
    .trim()
    .split(/\s+/)
    .filter((term) => term && !stopWords.has(term));
  if (!terms.length) return calculatorRegistry;
  return calculatorRegistry
    .map((calculator) => {
      const primary = [
        calculator.name,
        calculator.question,
        ...calculator.outputs.flatMap((output) => [
          output.name,
          output.symbol ?? "",
          output.unit ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase();
      const secondary = [
        calculator.summary,
        calculator.formula,
        calculator.formulaWords,
        ...calculator.inputs,
        ...calculator.inputSources,
        ...calculator.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9µ²×]+/g, " ");
      const keywordPhrase = calculator.keywords.some(
        (keyword) => keyword.toLowerCase() === normalizedQuery,
      );
      const score =
        terms.reduce(
          (total, term) =>
            total +
            (primary.includes(term) ? 3 : secondary.includes(term) ? 1 : -100),
          0,
        ) + (keywordPhrase ? 5 : 0);
      return { calculator, score };
    })
    .filter(({ score }) => score > -90)
    .sort(
      (a, b) =>
        b.score - a.score || a.calculator.name.localeCompare(b.calculator.name),
    )
    .map(({ calculator }) => calculator);
}
