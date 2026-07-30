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
import {
  calculateTargetFramingGeometry,
  positionAngleToDisplayRotationDegrees,
  type TargetFramingGeometry,
} from "../model/target-framing";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";

import { EquipmentConfigurationPanel } from "./equipment-configuration-panel";
import styles from "./field-of-view-lab.module.css";
import { FieldOfViewShell } from "./field-of-view-shell";
import { TargetFramingSimulator } from "./target-framing-simulator";

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
  const framingGeometry = useMemo<TargetFramingGeometry | null>(() => {
    if (!result || !selectedTarget) {
      return null;
    }

    try {
      return calculateTargetFramingGeometry({
        fieldOfViewDeg: result.fieldOfViewDeg,
        targetAngularWidthDeg: Number(selectedTarget.angularWidthDeg),
        targetAngularHeightDeg: Number(selectedTarget.angularHeightDeg),
        targetRotationDeg: positionAngleToDisplayRotationDegrees(
          Number(selectedTarget.defaultRotationDeg),
        ),
        frameRotationDeg: state.framing.frameRotationDeg,
        sensorOrientation: state.framing.sensorOrientation,
        displayZoom: state.framing.displayZoom,
      });
    } catch {
      return null;
    }
  }, [result, selectedTarget, state.framing]);
  const selectedTargetLabel = selectedTarget
    ? selectedTarget.catalogueName === selectedTarget.commonName
      ? selectedTarget.commonName
      : selectedTarget.commonName + " (" + selectedTarget.catalogueName + ")"
    : null;

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
      role="status"
    >
      <span aria-hidden="true" className={styles.summaryMark}>
        FOV
      </span>
      <div data-testid="primary-result">
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
      {selectedTargetLabel && framingGeometry ? (
        <span
          className={styles.visuallyHidden}
          data-testid="framing-live-status"
        >
          {selectedTargetLabel}:{" "}
          {framingGeometry.centeredTargetFit.fits
            ? "fits within the centred sensor frame"
            : "extends beyond the centred sensor frame"}
          .
        </span>
      ) : null}
    </section>
  );

  const visualisation = (
    <TargetFramingSimulator
      dispatch={dispatch}
      framing={state.framing}
      geometry={framingGeometry}
      target={selectedTarget}
    />
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
