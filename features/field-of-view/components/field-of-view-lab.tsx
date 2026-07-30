"use client";

import { useMemo, useReducer } from "react";

import { ResultCard, ResultGrid } from "@/components/design-system";
import { calculateImagingSystem } from "@/lib/calculations";
import type {
  ImagingSystemResult,
  SamplingAssessment,
} from "@/lib/calculations";
import {
  createEquipmentConfiguration,
  equipmentConfigurationReducer,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
} from "../model/equipment-configuration";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";

import { EquipmentConfigurationPanel } from "./equipment-configuration-panel";
import styles from "./field-of-view-lab.module.css";
import { FieldOfViewShell } from "./field-of-view-shell";

const SAMPLING_COPY: Record<SamplingAssessment, string> = {
  "likely-undersampled": "Likely undersampled for the stated seeing",
  "broadly-appropriate": "Broadly appropriate for many conditions",
  "likely-oversampled": "Likely oversampled for the stated seeing",
};

function formatDegrees(value: number): string {
  return value.toFixed(2) + "°";
}

function formatArcminutes(value: number): string {
  return (value * 60).toFixed(1) + "′";
}

export function FieldOfViewLab({
  catalogue,
}: {
  catalogue: FieldOfViewCatalogue;
}) {
  const [state, dispatch] = useReducer(
    equipmentConfigurationReducer,
    catalogue,
    createEquipmentConfiguration,
  );
  const telescopeInputs = resolveTelescopeInputs(state.telescope);
  const cameraSensor = resolveCameraSensor(state.camera);
  const opticalMultipliers = resolveModifierMultipliers(state.modifiers);
  const selectedTarget = catalogue.targets.find(
    ({ slug }) => slug === state.targetSlug,
  );
  const result = useMemo<ImagingSystemResult | null>(() => {
    if (
      telescopeInputs.nativeFocalLengthMm === null ||
      telescopeInputs.apertureMm === null ||
      !cameraSensor ||
      !opticalMultipliers
    ) {
      return null;
    }

    return calculateImagingSystem({
      nativeFocalLengthMm: telescopeInputs.nativeFocalLengthMm,
      apertureMm: telescopeInputs.apertureMm,
      opticalMultipliers,
      sensor: cameraSensor,
      binningFactor: Number(state.binning),
      seeingFwhmArcsec: state.seeingFwhmArcsec,
    });
  }, [
    cameraSensor,
    opticalMultipliers,
    state.binning,
    state.seeingFwhmArcsec,
    telescopeInputs.apertureMm,
    telescopeInputs.nativeFocalLengthMm,
  ]);

  const controls = (
    <EquipmentConfigurationPanel
      catalogue={catalogue}
      dispatch={dispatch}
      state={state}
    />
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
            <span>Complete the labelled setup to restore results.</span>
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
          The sensor outline uses the current camera proportions. Target scale
          and orientation arrive in the next work package.
        </p>
      </div>
      <div
        aria-describedby="framing-description"
        aria-label={
          result
            ? "Illustrative sensor frame with a " +
              formatDegrees(result.fieldOfViewDeg.horizontalDeg) +
              " by " +
              formatDegrees(result.fieldOfViewDeg.verticalDeg) +
              " field. " +
              (selectedTarget
                ? selectedTarget.commonName +
                  " is selected but is not yet drawn to scale."
                : "No target is selected.")
            : "Illustrative sensor frame; the field is unavailable until the configuration is valid."
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
            aspectRatio: result
              ? String(result.sensorDimensionsMm.widthMm) +
                " / " +
                String(result.sensorDimensionsMm.heightMm)
              : "3 / 2",
          }}
        />
        <span aria-hidden="true" className={styles.stageScale}>
          {result
            ? formatDegrees(result.fieldOfViewDeg.horizontalDeg) +
              " field width"
            : "field unavailable"}
        </span>
      </div>
      <p className={styles.visualDescription} id="framing-description">
        The grid and sensor outline are illustrative, not a calibrated sky
        survey.{" "}
        {selectedTarget
          ? selectedTarget.commonName +
            " is selected for the proportional target simulator, but no target scale is represented yet."
          : "No astronomical target scale is represented in this preview."}
      </p>
    </section>
  );

  const results = (
    <section className={styles.resultsPanel} aria-labelledby="results-title">
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Calculated now</p>
        <h2 id="results-title">Imaging results</h2>
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
            label="Sensor size"
            secondary={
              result.sensorDimensionsMm.diagonalMm.toFixed(2) + " mm diagonal"
            }
            value={
              result.sensorDimensionsMm.widthMm.toFixed(2) +
              " × " +
              result.sensorDimensionsMm.heightMm.toFixed(2) +
              " mm"
            }
          />
          <ResultCard
            label="Image scale"
            secondary={
              "Effective pixel size " +
              result.effectivePixelSizeUm.toFixed(2) +
              " µm"
            }
            value={result.imageScaleArcsecPerPixel.toFixed(2) + "″ / px"}
          />
          <ResultCard
            label="Effective optics"
            secondary={
              result.effectiveFocalLengthMm.toFixed(2) + " mm focal length"
            }
            value={"f/" + result.effectiveFocalRatio.toFixed(1)}
          />
          <ResultCard
            interpretation="Tracking, focus, optics, processing, and target type also affect the useful sampling."
            label="Sampling"
            secondary={state.seeingFwhmArcsec.toFixed(1) + "″ stated seeing"}
            statusText={SAMPLING_COPY[result.samplingAssessment]}
            value={result.pixelsPerSeeingFwhm.toFixed(2) + " px / FWHM"}
          />
        </ResultGrid>
      ) : (
        <p className={styles.unavailable}>
          Results are unavailable while a required value or optical multiplier
          is invalid. Correct the labelled field to continue.
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
