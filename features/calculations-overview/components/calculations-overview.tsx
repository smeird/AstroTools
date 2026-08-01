"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import {
  parseBackfocusSpacing,
  BACKFOCUS_SPACING_PERSISTENCE_KEY,
} from "@/features/backfocus-spacing/model/persistence";
import {
  parseGuidingRatio,
  GUIDING_RATIO_PERSISTENCE_KEY,
} from "@/features/guiding-ratio/model/persistence";
import {
  parseResolutionAndSamplingState,
  RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY,
} from "@/features/resolution-and-sampling/model/persistence";
import {
  parseSensorTilt,
  SENSOR_TILT_PERSISTENCE_KEY,
} from "@/features/sensor-tilt/model/persistence";
import {
  parseSharedImagingTrain,
  SHARED_IMAGING_TRAIN_KEY,
  type SharedImagingTrain,
} from "@/features/shared-equipment/telescope-selection";
import {
  calculateBackfocusSpacing,
  calculateDewHeater,
  calculateExactFieldOfView,
  calculateExposureSnr,
  calculateGuidingRatio,
  calculateImageScale,
  calculateMosaicPlanning,
  calculatePolarAlignmentDrift,
  calculateResolutionAndSampling,
  calculateSensorTilt,
  calculateStorageVolume,
} from "@/lib/calculations";

import styles from "./calculations-overview.module.css";

interface ResultRow {
  label: string;
  symbol?: string;
  value: string;
  unit?: string;
  kind?: string;
}
interface ResultSection {
  id: string;
  title: string;
  calculator: string;
  href: string;
  model: string;
  rows: ResultRow[];
  missing?: string | undefined;
}

const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
function storedValues(key: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as {
      version?: unknown;
      values?: unknown;
    };
    return parsed.version === 1 &&
      parsed.values &&
      typeof parsed.values === "object"
      ? (parsed.values as Record<string, string>)
      : null;
  } catch {
    return null;
  }
}
function safe<T>(calculation: () => T): T | null {
  try {
    return calculation();
  } catch {
    return null;
  }
}

function buildSections(train: SharedImagingTrain): ResultSection[] {
  const focal = Number(train.effectiveFocalLengthMm),
    nativeFocal = Number(train.nativeFocalLengthMm),
    aperture = Number(train.apertureMm),
    pixel = Number(train.pixelSizeUm),
    binning = Number(train.binningFactor),
    width = Number(train.sensorWidthMm),
    height = Number(train.sensorHeightMm);
  const field = calculateExactFieldOfView({
    effectiveFocalLengthMm: focal,
    sensorWidthMm: width,
    sensorHeightMm: height,
  });
  const imageScale = calculateImageScale({
    effectiveFocalLengthMm: focal,
    effectivePixelSizeUm: pixel * binning,
  });
  const sections: ResultSection[] = [
    {
      id: "geometry",
      title: "Optical geometry",
      calculator: "Field of View",
      href: "/calculators/field-of-view",
      model: "Exact geometry",
      rows: [
        {
          label: "Native focal length",
          symbol: "f₀",
          value: format(nativeFocal, 0),
          unit: "mm",
        },
        {
          label: "Optical multiplier",
          symbol: "m",
          value: format(Number(train.opticalMultiplier), 3),
          unit: "×",
        },
        {
          label: "Effective focal length",
          symbol: "f",
          value: format(focal, 0),
          unit: "mm",
        },
        {
          label: "Effective focal ratio",
          symbol: "N",
          value: format(focal / aperture, 2),
          unit: "f/",
        },
        {
          label: "Horizontal field",
          symbol: "θₕ",
          value: format(field.horizontalDeg, 3),
          unit: "°",
        },
        {
          label: "Vertical field",
          symbol: "θᵥ",
          value: format(field.verticalDeg, 3),
          unit: "°",
        },
        {
          label: "Diagonal field",
          symbol: "θd",
          value: format(field.diagonalDeg, 3),
          unit: "°",
        },
        {
          label: "Image scale",
          symbol: "s",
          value: format(imageScale, 3),
          unit: "arcsec/px",
        },
      ],
    },
    {
      id: "modifier",
      title: "Optical train transformation",
      calculator: "Reducer & Barlow",
      href: "/calculators/modifier-effects",
      model: "Exact multiplier model",
      rows: [
        {
          label: "Native focal length",
          value: format(nativeFocal, 0),
          unit: "mm",
        },
        {
          label: "Effective focal length",
          value: format(focal, 0),
          unit: "mm",
        },
        {
          label: "Effective focal ratio",
          value: format(focal / aperture, 2),
          unit: "f/",
        },
        { label: "Binning", value: String(binning), unit: "×" },
      ],
    },
  ];

  const resolutionRaw = window.localStorage.getItem(
    RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY,
  );
  const resolution = resolutionRaw
    ? parseResolutionAndSamplingState(resolutionRaw)
    : null;
  if (resolution) {
    const result = safe(() =>
      calculateResolutionAndSampling(
        Object.fromEntries(
          Object.entries(resolution).map(([key, value]) => [
            key,
            Number(value),
          ]),
        ) as never,
      ),
    );
    sections.push({
      id: "resolution",
      title: "Resolution and sampling",
      calculator: "Resolution & Sampling",
      href: "/calculators/resolution-and-sampling",
      model: "Diffraction estimates and exact sampling",
      rows: result
        ? [
            {
              label: "Rayleigh limit",
              value: format(result.rayleighLimitArcsec, 3),
              unit: "arcsec",
            },
            {
              label: "Dawes estimate",
              value: format(result.dawesLimitArcsec, 3),
              unit: "arcsec",
              kind: "empirical",
            },
            {
              label: "Image scale",
              value: format(result.imageScaleArcsecPerPixel, 3),
              unit: "arcsec/px",
            },
            {
              label: "Pixels per Rayleigh limit",
              value: format(result.pixelsPerRayleighLimit, 2),
            },
            {
              label: "Pixels per seeing FWHM",
              value: format(result.pixelsPerSeeingFwhm, 2),
            },
            {
              label: "Critical focal ratio",
              value: format(result.criticalFocalRatio, 2),
              unit: "f/",
            },
          ]
        : [],
      missing: result ? undefined : "Saved resolution inputs are invalid.",
    });
  } else
    sections.push({
      id: "resolution",
      title: "Resolution and sampling",
      calculator: "Resolution & Sampling",
      href: "/calculators/resolution-and-sampling",
      model: "Needs wavelength and seeing",
      rows: [
        {
          label: "Equipment image scale",
          value: format(imageScale, 3),
          unit: "arcsec/px",
        },
      ],
      missing:
        "Choose wavelength and seeing in the detail calculator for diffraction and sampling results.",
    });

  const guiding = storedValues(GUIDING_RATIO_PERSISTENCE_KEY);
  const guidingParsed = guiding
    ? parseGuidingRatio(JSON.stringify({ version: 1, values: guiding }))
    : null;
  const guidingResult = guidingParsed
    ? safe(() =>
        calculateGuidingRatio(
          Object.fromEntries(
            Object.entries(guidingParsed).map(([k, v]) => [k, Number(v)]),
          ) as never,
        ),
      )
    : null;
  sections.push({
    id: "guiding",
    title: "Guiding",
    calculator: "Guiding Ratio",
    href: "/calculators/guiding-ratio",
    model: "Angular-scale comparison",
    rows: guidingResult
      ? [
          {
            label: "Imaging scale",
            value: format(guidingResult.imagingScaleArcsecPerPixel, 3),
            unit: "arcsec/px",
          },
          {
            label: "Guide scale",
            value: format(guidingResult.guideScaleArcsecPerPixel, 3),
            unit: "arcsec/px",
          },
          {
            label: "Guide : imaging ratio",
            value: format(guidingResult.guideToImagingRatio, 2),
            unit: ": 1",
          },
          {
            label: "Half-pixel centroid demand",
            value: format(
              guidingResult.guideCentroidPixelsForHalfImagingPixel,
              3,
            ),
            unit: "guide px",
          },
        ]
      : [],
    missing: guidingResult
      ? undefined
      : "Add guide-scope focal length and guide-camera pixel pitch.",
  });

  const tiltRaw = window.localStorage.getItem(SENSOR_TILT_PERSISTENCE_KEY),
    tiltValues = tiltRaw ? parseSensorTilt(tiltRaw) : null;
  const tilt = tiltValues
    ? safe(() =>
        calculateSensorTilt(
          Object.fromEntries(
            Object.entries(tiltValues).map(([k, v]) => [k, Number(v)]),
          ) as never,
        ),
      )
    : null;
  sections.push({
    id: "tilt",
    title: "Sensor plane",
    calculator: "Sensor Tilt",
    href: "/calculators/sensor-tilt",
    model: "First-order plane model",
    rows: tilt
      ? Object.entries(tilt)
          .filter(([, v]) => typeof v === "number")
          .map(([label, value]) => ({
            label,
            value: format(value as number, 3),
          }))
      : [],
    missing: tilt
      ? undefined
      : "Enter measured focus differences and adjuster spacing.",
  });

  const backRaw = window.localStorage.getItem(
      BACKFOCUS_SPACING_PERSISTENCE_KEY,
    ),
    backValues = backRaw ? parseBackfocusSpacing(backRaw) : null;
  const back = backValues
    ? safe(() =>
        calculateBackfocusSpacing(
          Object.fromEntries(
            Object.entries(backValues).map(([k, v]) => [k, Number(v)]),
          ) as never,
        ),
      )
    : null;
  sections.push({
    id: "backfocus",
    title: "Mechanical spacing",
    calculator: "Back-focus",
    href: "/calculators/backfocus-spacing",
    model: "First-order spacing model",
    rows: back
      ? [
          {
            label: "Fixed train",
            value: format(back.fixedTrainLengthMm),
            unit: "mm",
          },
          {
            label: "Corrected target",
            value: format(back.correctedTargetMm),
            unit: "mm",
          },
          {
            label: "Required spacer",
            value: format(back.requiredSpacerMm),
            unit: "mm",
          },
          {
            label: "Spacing error",
            value: format(back.spacingErrorMm),
            unit: "mm",
          },
          { label: "Status", value: back.status },
        ]
      : [],
    missing: back
      ? undefined
      : "Enter component depths and nominal back focus.",
  });

  const calculated = <T,>(
    key: string,
    fn: (values: Record<string, number>) => T,
  ) => {
    const values = storedValues(key);
    return values
      ? safe(() =>
          fn(
            Object.fromEntries(
              Object.entries(values).map(([k, v]) => [k, Number(v)]),
            ),
          ),
        )
      : null;
  };
  const polar = calculated("astrotools.polar-drift.settings.v1", (v) =>
    calculatePolarAlignmentDrift(v as never),
  );
  sections.push({
    id: "polar",
    title: "Alignment drift",
    calculator: "Polar Alignment",
    href: "/calculators/polar-alignment-drift",
    model: "Small-angle estimate",
    rows: polar
      ? [
          {
            label: "Sky drift rate",
            value: format(polar.driftRateArcsecPerMinute, 3),
            unit: "arcsec/min",
          },
          {
            label: "Azimuth error",
            value:
              polar.azimuthErrorArcmin === null
                ? "low sensitivity"
                : format(polar.azimuthErrorArcmin, 2),
            unit: polar.azimuthErrorArcmin === null ? "" : "arcmin",
          },
          {
            label: "Altitude error",
            value:
              polar.altitudeErrorArcmin === null
                ? "low sensitivity"
                : format(polar.altitudeErrorArcmin, 2),
            unit: polar.altitudeErrorArcmin === null ? "" : "arcmin",
          },
        ]
      : [],
    missing: polar
      ? undefined
      : "Add signed drift, duration, latitude and hour angle.",
  });
  const exposure = calculated("astrotools.exposure-snr.settings.v1", (v) =>
    calculateExposureSnr(v as never),
  );
  sections.push({
    id: "exposure",
    title: "Exposure and noise",
    calculator: "Exposure & SNR",
    href: "/calculators/exposure-snr",
    model: "Ideal calibrated stack",
    rows: exposure
      ? [
          { label: "Stack SNR", value: format(exposure.snr) },
          { label: "Single-frame SNR", value: format(exposure.singleFrameSnr) },
          {
            label: "Integration",
            value: format(exposure.totalIntegrationSeconds / 3600),
            unit: "h",
          },
          {
            label: "Source electrons",
            value: format(exposure.sourceElectrons, 0),
            unit: "e⁻",
          },
          {
            label: "Sky electrons",
            value: format(exposure.skyElectrons, 0),
            unit: "e⁻",
          },
          {
            label: "Sky / read variance",
            value: format(exposure.skyToReadNoiseVarianceRatio, 2),
            unit: "×",
          },
        ]
      : [],
    missing: exposure
      ? undefined
      : "Add measured source, sky, dark-current and read-noise rates.",
  });
  const mosaic = calculated("astrotools.mosaic-planning.settings.v1", (v) =>
    calculateMosaicPlanning(v as never),
  );
  sections.push({
    id: "mosaic",
    title: "Mosaic",
    calculator: "Mosaic Planning",
    href: "/calculators/mosaic-planning",
    model: "Aligned rectangular grid",
    rows: mosaic
      ? [
          { label: "Grid", value: `${mosaic.columns} × ${mosaic.rows}` },
          { label: "Panels", value: String(mosaic.panelCount) },
          {
            label: "Panel field",
            value: `${format(mosaic.panelWidthDeg)} × ${format(mosaic.panelHeightDeg)}`,
            unit: "°",
          },
          {
            label: "Coverage",
            value: `${format(mosaic.achievedWidthDeg)} × ${format(mosaic.achievedHeightDeg)}`,
            unit: "°",
          },
          {
            label: "Integration",
            value: format(mosaic.totalIntegrationHours),
            unit: "h",
          },
        ]
      : [],
    missing: mosaic
      ? undefined
      : "Add target extent, overlap and integration per panel.",
  });
  const dew = calculated("astrotools.dew-heater.settings.v1", (v) =>
    calculateDewHeater(v as never),
  );
  sections.push({
    id: "dew",
    title: "Environmental control",
    calculator: "Dew & Heater",
    href: "/calculators/dew-heater",
    model: "Magnus equation plus thermal estimate",
    rows: dew
      ? [
          { label: "Dew point", value: format(dew.dewPointC), unit: "°C" },
          {
            label: "Ambient margin",
            value: format(dew.ambientDewMarginC),
            unit: "°C",
          },
          {
            label: "Target optic temperature",
            value: format(dew.targetTemperatureC),
            unit: "°C",
          },
          {
            label: "Estimated power",
            value: format(dew.estimatedPowerW),
            unit: "W",
            kind: "estimate",
          },
          {
            label: "Estimated current",
            value: format(dew.estimatedCurrentA),
            unit: "A",
            kind: "estimate",
          },
        ]
      : [],
    missing: dew
      ? undefined
      : "Add local temperature, humidity and heater geometry.",
  });
  const storage = calculated("astrotools.storage-volume.settings.v1", (v) =>
    calculateStorageVolume(v as never),
  );
  sections.push({
    id: "storage",
    title: "Data budget",
    calculator: "Storage",
    href: "/calculators/storage-volume",
    model: "Uncompressed capture estimate",
    rows: storage
      ? [
          {
            label: "Per frame",
            value: format(storage.bytesPerFrame / 2 ** 20),
            unit: "MiB",
          },
          { label: "Light frames", value: String(storage.lightFrameCount) },
          { label: "Total frames", value: String(storage.totalFrameCount) },
          {
            label: "Light data",
            value: format(storage.lightDataBytes / 2 ** 30),
            unit: "GiB",
          },
          {
            label: "Total data",
            value: format(storage.totalDataGiB),
            unit: "GiB",
          },
          {
            label: "Average write",
            value: format(storage.sustainedWriteMiBPerSecond, 3),
            unit: "MiB/s",
          },
        ]
      : [],
    missing: storage
      ? undefined
      : "Add capture format, exposure cadence and session duration.",
  });
  return sections;
}

export function CalculationsOverview() {
  const [train, setTrain] = useState<SharedImagingTrain | null>(null);
  const [sections, setSections] = useState<ResultSection[]>([]);
  useEffect(() => {
    const raw = window.localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const restored = raw ? parseSharedImagingTrain(raw) : null;
    startTransition(() => {
      setTrain(restored);
      setSections(restored ? buildSections(restored) : []);
    });
  }, []);
  useEffect(() => {
    document.title = train?.rigName
      ? `${train.rigName} · Calculations · Astrotools`
      : "All Calculations · Astrotools";
  }, [train]);
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← Astrotools home
      </Link>
      <CalculatorNavigation active="calculations" />
      <header className={`${styles.intro} ${styles.screenOnly}`}>
        <div>
          <p className="eyebrow">Consolidated calculations</p>
          <h1>{train?.rigName || "One train. Every result."}</h1>
          <p>
            Presentation view explains the result set; Academic view compresses
            it into a reference sheet. The numbers are identical in both.
          </p>
        </div>
        {train ? (
          <button
            className={styles.exportButton}
            onClick={() => window.print()}
            type="button"
          >
            Export ordered PDF
          </button>
        ) : null}
      </header>
      {!train ? (
        <section className={`${styles.empty} ${styles.screenOnly}`}>
          <h2>No equipment train is available</h2>
          <p>
            Configure and save the imaging train first. No calculation defaults
            have been invented.
          </p>
          <Link href="/equipment">Specify equipment →</Link>
        </section>
      ) : (
        <>
          <section
            className={`${styles.train} ${styles.screenOnly}`}
            aria-labelledby="calculation-context"
          >
            <h2 id="calculation-context">Calculation context</h2>
            {train.rigName ? (
              <p className={styles.printRigName}>Rig: {train.rigName}</p>
            ) : null}
            <dl>
              <div>
                <dt>Telescope</dt>
                <dd>{train.telescopeLabel}</dd>
              </div>
              <div>
                <dt>Camera</dt>
                <dd>{train.cameraLabel}</dd>
              </div>
              <div>
                <dt>Effective focal length</dt>
                <dd>{train.effectiveFocalLengthMm} mm</dd>
              </div>
              <div>
                <dt>Aperture</dt>
                <dd>{train.apertureMm} mm</dd>
              </div>
              <div>
                <dt>Modifier</dt>
                <dd>{train.opticalMultiplier}×</dd>
              </div>
              <div>
                <dt>Binning</dt>
                <dd>{train.binningFactor}×</dd>
              </div>
              {train.bortleClass ? (
                <div>
                  <dt>Bortle class</dt>
                  <dd>{train.bortleClass}</dd>
                </div>
              ) : null}
              {train.skyQualityMagArcsec2 ? (
                <div>
                  <dt>Sky quality</dt>
                  <dd>{train.skyQualityMagArcsec2} mag/arcsec²</dd>
                </div>
              ) : null}
            </dl>
            <Link href="/equipment">Change equipment →</Link>
          </section>
          <div className={`${styles.sheet} ${styles.screenOnly}`}>
            {sections.map((section) => (
              <section
                className={styles.section}
                id={section.id}
                key={section.id}
              >
                <header>
                  <div>
                    <p>{section.model}</p>
                    <h2>{section.title}</h2>
                  </div>
                  <Link href={section.href}>
                    {section.calculator} details →
                  </Link>
                </header>
                {section.rows.length ? (
                  <div
                    className={styles.tableRegion}
                    role="region"
                    aria-label={`${section.title} result table`}
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Quantity</th>
                          <th scope="col">Symbol</th>
                          <th scope="col">Value</th>
                          <th scope="col">Unit</th>
                          <th scope="col">Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row) => (
                          <tr key={`${section.id}-${row.label}`}>
                            <th scope="row">{row.label}</th>
                            <td>{row.symbol ?? "—"}</td>
                            <td>{row.value}</td>
                            <td>{row.unit ?? "—"}</td>
                            <td>{row.kind ?? section.model}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {section.missing ? (
                  <p className={styles.missing}>{section.missing}</p>
                ) : null}
              </section>
            ))}
          </div>
        </>
      )}
      {train ? (
        <article
          className={styles.report}
          aria-label="Ordered calculation report"
        >
          <header className={styles.reportCover}>
            <p>Astrotools · Calculation report</p>
            <h1>{train.rigName || "Unnamed imaging rig"}</h1>
            <p>
              Ordered technical dossier for the selected optical train. Values
              retain full calculation precision until presentation formatting.
            </p>
          </header>
          <section className={styles.reportEquipment}>
            <h2>1. Equipment specification</h2>
            <table>
              <tbody>
                <tr>
                  <th scope="row">Telescope</th>
                  <td>{train.telescopeLabel}</td>
                </tr>
                <tr>
                  <th scope="row">Camera</th>
                  <td>{train.cameraLabel}</td>
                </tr>
                <tr>
                  <th scope="row">Native focal length</th>
                  <td>{train.nativeFocalLengthMm} mm</td>
                </tr>
                <tr>
                  <th scope="row">Effective focal length</th>
                  <td>{train.effectiveFocalLengthMm} mm</td>
                </tr>
                <tr>
                  <th scope="row">Aperture</th>
                  <td>{train.apertureMm} mm</td>
                </tr>
                <tr>
                  <th scope="row">Optical multiplier</th>
                  <td>{train.opticalMultiplier}×</td>
                </tr>
                <tr>
                  <th scope="row">Sensor</th>
                  <td>
                    {format(Number(train.sensorWidthMm), 3)} ×{" "}
                    {format(Number(train.sensorHeightMm), 3)} mm
                  </td>
                </tr>
                <tr>
                  <th scope="row">Pixel pitch / binning</th>
                  <td>
                    {train.pixelSizeUm} µm / {train.binningFactor}×
                  </td>
                </tr>
                {train.bortleClass ? (
                  <tr>
                    <th scope="row">Observing-site Bortle class</th>
                    <td>{train.bortleClass}</td>
                  </tr>
                ) : null}
                {train.skyQualityMagArcsec2 ? (
                  <tr>
                    <th scope="row">Observed sky quality</th>
                    <td>{train.skyQualityMagArcsec2} mag/arcsec²</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
          <section className={styles.reportCalculations}>
            <h2>2. Ordered calculations</h2>
            {sections.map((section, index) => (
              <section
                className={styles.reportSection}
                key={`report-${section.id}`}
              >
                <header>
                  <p>{section.model}</p>
                  <h3>
                    2.{index + 1} {section.title}
                  </h3>
                </header>
                {section.rows.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Quantity</th>
                        <th scope="col">Symbol</th>
                        <th scope="col">Value</th>
                        <th scope="col">Unit</th>
                        <th scope="col">Model / class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={`report-${section.id}-${row.label}`}>
                          <th scope="row">{row.label}</th>
                          <td>{row.symbol ?? "—"}</td>
                          <td>{row.value}</td>
                          <td>{row.unit ?? "—"}</td>
                          <td>{row.kind ?? section.model}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {section.missing ? (
                  <p className={styles.reportMissing}>
                    <strong>Additional measurement required.</strong>{" "}
                    {section.missing}
                  </p>
                ) : null}
              </section>
            ))}
          </section>
          <section className={styles.reportMethod}>
            <h2>3. Method and interpretation</h2>
            <p>
              Exact geometry, diffraction estimates, empirical relationships and
              first-order engineering models are labelled separately. Missing
              measurements are not replaced with invented defaults. Use each
              linked calculator in the interactive workspace for its complete
              equation, assumptions and interpretation.
            </p>
          </section>
        </article>
      ) : null}
    </main>
  );
}
