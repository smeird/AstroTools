"use client";

import { useMemo, useState } from "react";

import {
  Combobox,
  NumericInput,
  RangeInput,
  ResultCard,
  ResultGrid,
  SegmentedControl,
} from "@/components/design-system";
import { calculateImagingSystem } from "@/lib/calculations";
import type {
  ImagingSystemResult,
  SamplingAssessment,
} from "@/lib/calculations";

import styles from "./field-of-view-lab.module.css";
import { FieldOfViewShell } from "./field-of-view-shell";

const SENSOR_OPTIONS = [
  {
    value: "aps-c",
    label: "APS-C reference · 23.49 × 15.70 mm",
    searchText: "crop sensor",
    widthMm: 23.49248,
    heightMm: 15.70176,
    pixelSizeUm: 3.76,
  },
  {
    value: "full-frame",
    label: "Full-frame reference · 36.00 × 24.00 mm",
    searchText: "35mm sensor",
    widthMm: 36,
    heightMm: 24,
    pixelSizeUm: 3.76,
  },
  {
    value: "four-thirds",
    label: "Four Thirds reference · 17.30 × 13.00 mm",
    searchText: "micro four thirds mft",
    widthMm: 17.3,
    heightMm: 13,
    pixelSizeUm: 3.76,
  },
] as const;

const BINNING_OPTIONS = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "3", label: "3×" },
] as const;

type BinningValue = (typeof BINNING_OPTIONS)[number]["value"];

const SAMPLING_COPY: Record<SamplingAssessment, string> = {
  "likely-undersampled": "Likely undersampled for the stated seeing",
  "broadly-appropriate": "Broadly appropriate for many conditions",
  "likely-oversampled": "Likely oversampled for the stated seeing",
};

function parseBoundedPositive(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function formatDegrees(value: number): string {
  return `${value.toFixed(2)}°`;
}

function formatArcminutes(value: number): string {
  return `${(value * 60).toFixed(1)}′`;
}

export function FieldOfViewLab() {
  const defaultSensor = SENSOR_OPTIONS[0];
  const [focalLength, setFocalLength] = useState("600");
  const [aperture, setAperture] = useState("80");
  const [seeing, setSeeing] = useState(2);
  const [binning, setBinning] = useState<BinningValue>("1");
  const [sensorQuery, setSensorQuery] = useState<string>(defaultSensor.label);
  const [sensorValue, setSensorValue] = useState<string | null>(
    defaultSensor.value,
  );
  const nativeFocalLengthMm = parseBoundedPositive(focalLength, 10, 20_000);
  const apertureMm = parseBoundedPositive(aperture, 5, 2_000);
  const selectedSensor = SENSOR_OPTIONS.find(
    (sensor) => sensor.value === sensorValue,
  );
  const result = useMemo<ImagingSystemResult | null>(() => {
    if (!nativeFocalLengthMm || !apertureMm || !selectedSensor) {
      return null;
    }

    return calculateImagingSystem({
      nativeFocalLengthMm,
      apertureMm,
      sensor: {
        geometry: {
          source: "physical-dimensions",
          widthMm: selectedSensor.widthMm,
          heightMm: selectedSensor.heightMm,
        },
        nativePixelSizeUm: selectedSensor.pixelSizeUm,
      },
      binningFactor: Number(binning),
      seeingFwhmArcsec: seeing,
    });
  }, [apertureMm, binning, nativeFocalLengthMm, seeing, selectedSensor]);

  const controls = (
    <section className={styles.panel} aria-labelledby="equipment-title">
      <div className={styles.panelHeader}>
        <p className="eyebrow">Reference setup</p>
        <h2 id="equipment-title">Shape the optical path</h2>
        <p>
          These local values exercise the production controls and calculation
          engine without a catalogue dependency.
        </p>
      </div>

      <div className={styles.controlGroup}>
        <Combobox
          description="Type to filter, then use arrow keys and Enter to choose."
          error={
            selectedSensor ? undefined : "Choose a reference sensor format."
          }
          id="sensor-format"
          label="Reference sensor"
          name="sensor-format"
          onQueryChange={setSensorQuery}
          onSelectionChange={setSensorValue}
          options={SENSOR_OPTIONS}
          query={sensorQuery}
          required
          selectedValue={sensorValue}
        />
        <NumericInput
          description="The principal input that controls field of view."
          error={
            nativeFocalLengthMm
              ? undefined
              : "Enter a focal length from 10 to 20,000 mm."
          }
          id="focal-length"
          label="Native focal length"
          max={20_000}
          min={10}
          name="focal-length"
          onValueChange={setFocalLength}
          required
          step="any"
          unit="mm"
          unitLabel="millimetres"
          value={focalLength}
        />
        <NumericInput
          description="Used with focal length to calculate the focal ratio."
          error={
            apertureMm ? undefined : "Enter an aperture from 5 to 2,000 mm."
          }
          id="aperture"
          label="Aperture"
          max={2_000}
          min={5}
          name="aperture"
          onValueChange={setAperture}
          required
          step="any"
          unit="mm"
          unitLabel="millimetres"
          value={aperture}
        />
        <SegmentedControl<BinningValue>
          description="Shown as effective pixel grouping for this reference preview."
          id="binning"
          label="Binning"
          name="binning"
          onValueChange={setBinning}
          options={BINNING_OPTIONS}
          value={binning}
        />
        <RangeInput
          description="An estimate of atmospheric stellar FWHM at your site."
          id="seeing"
          label="Seeing"
          max={5}
          min={1}
          name="seeing"
          onValueChange={setSeeing}
          step={0.1}
          value={seeing}
          valueText={`${seeing.toFixed(1)} arcseconds`}
        />
      </div>
    </section>
  );

  const summary = (
    <section
      aria-atomic="true"
      aria-live="polite"
      className={styles.summary}
      data-testid="primary-result"
      role="status"
    >
      <span aria-hidden="true" className={styles.summaryMark}>
        FOV
      </span>
      <div>
        <span className={styles.summaryLabel}>Current field</span>
        <p className={styles.summaryValue}>
          {result ? (
            <>
              {formatDegrees(result.fieldOfViewDeg.horizontalDeg)} ×{" "}
              {formatDegrees(result.fieldOfViewDeg.verticalDeg)}
              <span className={styles.summarySecondary}>
                {formatArcminutes(result.fieldOfViewDeg.horizontalDeg)} ×{" "}
                {formatArcminutes(result.fieldOfViewDeg.verticalDeg)}
              </span>
            </>
          ) : (
            <span>Complete the reference setup to restore results.</span>
          )}
        </p>
      </div>
    </section>
  );

  const visualisation = (
    <section className={styles.stagePanel} aria-labelledby="framing-title">
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Deterministic preview</p>
        <h2 id="framing-title">Framing workspace</h2>
        <p>
          A stable visual foundation for the proportional target simulator in a
          later package.
        </p>
      </div>
      <div
        aria-describedby="framing-description"
        aria-label={
          result
            ? `Illustrative sensor frame with a ${formatDegrees(result.fieldOfViewDeg.horizontalDeg)} by ${formatDegrees(result.fieldOfViewDeg.verticalDeg)} field.`
            : "Illustrative sensor frame; the field is unavailable until the reference setup is valid."
        }
        className={styles.stage}
        role="img"
      >
        <span aria-hidden="true" className={styles.stageLabel}>
          illustrative field
        </span>
        <span
          aria-hidden="true"
          className={styles.frame}
          style={{
            aspectRatio: selectedSensor
              ? `${selectedSensor.widthMm} / ${selectedSensor.heightMm}`
              : "3 / 2",
          }}
        />
        <span aria-hidden="true" className={styles.stageScale}>
          {result
            ? `${formatDegrees(result.fieldOfViewDeg.horizontalDeg)} field width`
            : "field unavailable"}
        </span>
      </div>
      <p className={styles.visualDescription} id="framing-description">
        The grid and sensor outline are illustrative, not a calibrated sky
        survey. No astronomical target scale is represented in this preview.
      </p>
    </section>
  );

  const results = (
    <section className={styles.resultsPanel} aria-labelledby="results-title">
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Calculated now</p>
        <h2 id="results-title">Reference results</h2>
        <p>Full precision is retained; values below are rounded for display.</p>
      </div>
      {result ? (
        <ResultGrid>
          <ResultCard
            label="Diagonal field"
            secondary={formatArcminutes(result.fieldOfViewDeg.diagonalDeg)}
            value={formatDegrees(result.fieldOfViewDeg.diagonalDeg)}
          />
          <ResultCard
            label="Image scale"
            secondary={`Effective pixel size ${result.effectivePixelSizeUm.toFixed(2)} µm`}
            value={`${result.imageScaleArcsecPerPixel.toFixed(2)}″ / px`}
          />
          <ResultCard
            label="Effective optics"
            secondary={`${result.effectiveFocalLengthMm.toFixed(0)} mm focal length`}
            value={`f/${result.effectiveFocalRatio.toFixed(1)}`}
          />
          <ResultCard
            interpretation="Tracking, focus, optics, processing, and target type also affect the useful sampling."
            label="Sampling"
            secondary={`${seeing.toFixed(1)}″ stated seeing`}
            statusText={SAMPLING_COPY[result.samplingAssessment]}
            value={`${result.pixelsPerSeeingFwhm.toFixed(2)} px / FWHM`}
          />
        </ResultGrid>
      ) : (
        <p className={styles.unavailable}>
          Results are unavailable while a required reference value is invalid.
          Correct the labelled field to continue.
        </p>
      )}
    </section>
  );

  return (
    <FieldOfViewShell
      controls={controls}
      results={results}
      summary={summary}
      visualisation={visualisation}
    />
  );
}
