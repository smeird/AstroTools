"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import { ResultCard, ResultGrid } from "@/components/design-system";
import { calculateImagingSystem } from "@/lib/calculations";
import type { ImagingSystemResult } from "@/lib/calculations";
import {
  createEquipmentConfiguration,
  equipmentConfigurationReducer,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
} from "../model/equipment-configuration";
import {
  formatArcminutes,
  formatDecimal,
  formatDegrees,
  presentPhysicalLength,
  SAMPLING_ASSESSMENT_LABELS,
} from "../model/calculation-presentation";
import {
  calculateTargetFramingGeometry,
  positionAngleToDisplayRotationDegrees,
  type TargetFramingGeometry,
} from "../model/target-framing";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";
import type { EquipmentConfigurationState } from "../model/equipment-configuration";
import type { FieldOfViewShareNotice } from "../schemas/shareable-state";
import {
  serializeSharedTelescopeSelection,
  SHARED_TELESCOPE_SELECTION_KEY,
  telescopeSelectionFromConfiguration,
} from "@/features/shared-equipment/telescope-selection";
import {
  FIELD_OF_VIEW_PERSISTENCE_KEY,
  parsePersistedFieldOfViewState,
  serializePersistedFieldOfViewState,
} from "../model/persistence";

import {
  AccessibleAngularPair,
  AccessibleArcminutePair,
  CalculationEquations,
} from "./calculation-equations";
import { EquipmentConfigurationPanel } from "./equipment-configuration-panel";
import styles from "./field-of-view-lab.module.css";
import { FieldOfViewShell } from "./field-of-view-shell";
import { ShareConfiguration } from "./share-configuration";
import { TargetFramingSimulator } from "./target-framing-simulator";

export function FieldOfViewLab({
  catalogue,
  initialConfiguration,
  shareNotice,
  restorePersistedState = false,
}: {
  catalogue: FieldOfViewCatalogue;
  initialConfiguration?: EquipmentConfigurationState | undefined;
  shareNotice?: FieldOfViewShareNotice | null | undefined;
  restorePersistedState?: boolean;
}) {
  const [persistedStateLoaded, setPersistedStateLoaded] = useState(
    !restorePersistedState,
  );
  const [state, dispatch] = useReducer(
    equipmentConfigurationReducer,
    initialConfiguration ?? createEquipmentConfiguration(catalogue),
  );
  useEffect(() => {
    const stored = restorePersistedState
      ? window.localStorage.getItem(FIELD_OF_VIEW_PERSISTENCE_KEY)
      : null;
    const restored = stored
      ? parsePersistedFieldOfViewState(stored, catalogue)
      : null;
    startTransition(() => {
      if (restored) {
        dispatch({ type: "hydrate", state: restored });
      }
      setPersistedStateLoaded(true);
    });
  }, [catalogue, restorePersistedState]);
  useEffect(() => {
    if (!persistedStateLoaded) return;
    const serialized = serializePersistedFieldOfViewState(state);
    if (serialized) {
      window.localStorage.setItem(FIELD_OF_VIEW_PERSISTENCE_KEY, serialized);
    }
  }, [persistedStateLoaded, state]);
  useEffect(() => {
    if (!persistedStateLoaded) return;
    const selection = telescopeSelectionFromConfiguration(state.telescope);
    if (selection) {
      window.localStorage.setItem(
        SHARED_TELESCOPE_SELECTION_KEY,
        serializeSharedTelescopeSelection(selection),
      );
    }
  }, [persistedStateLoaded, state.telescope]);
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
    <section className={styles.summary} aria-labelledby="current-field-title">
      <span aria-hidden="true" className={styles.summaryMark}>
        FOV
      </span>
      <div
        aria-atomic="true"
        aria-live="polite"
        data-testid="primary-result"
        role="status"
      >
        <span className={styles.summaryLabel} id="current-field-title">
          Current field
        </span>
        <p className={styles.summaryValue}>
          {result ? (
            <>
              <AccessibleAngularPair
                horizontalDeg={result.fieldOfViewDeg.horizontalDeg}
                verticalDeg={result.fieldOfViewDeg.verticalDeg}
              />
              <span className={styles.summarySecondary}>
                <AccessibleArcminutePair
                  horizontalDeg={result.fieldOfViewDeg.horizontalDeg}
                  verticalDeg={result.fieldOfViewDeg.verticalDeg}
                />
              </span>
            </>
          ) : (
            <span>Complete the labelled setup to restore results.</span>
          )}
        </p>
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
      </div>
      {result ? (
        <dl className={styles.summaryMetrics}>
          <ResultCard
            label="Diagonal field"
            secondary={
              <>
                <span aria-hidden="true">
                  {formatArcminutes(result.fieldOfViewDeg.diagonalDeg)}
                </span>
                <span className={styles.visuallyHidden}>
                  {formatDecimal(result.fieldOfViewDeg.diagonalDeg * 60, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  arcminutes
                </span>
              </>
            }
            value={
              <>
                <span aria-hidden="true">
                  {formatDegrees(result.fieldOfViewDeg.diagonalDeg)}
                </span>
                <span className={styles.visuallyHidden}>
                  {formatDecimal(result.fieldOfViewDeg.diagonalDeg, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  degrees
                </span>
              </>
            }
          />
          <ResultCard
            label="Image scale"
            secondary={
              <>
                <span aria-hidden="true">
                  Equivalent output pitch{" "}
                  {formatDecimal(result.effectivePixelSizeUm, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  µm
                </span>
                <span className={styles.visuallyHidden}>
                  Equivalent output pitch{" "}
                  {formatDecimal(result.effectivePixelSizeUm, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  micrometres
                </span>
              </>
            }
            value={
              <>
                <span aria-hidden="true">
                  {formatDecimal(result.imageScaleArcsecPerPixel, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  ″ / output px
                </span>
                <span className={styles.visuallyHidden}>
                  {formatDecimal(result.imageScaleArcsecPerPixel, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  arcseconds per output pixel
                </span>
              </>
            }
          />
        </dl>
      ) : null}
      <ShareConfiguration state={state} />
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
    <section
      aria-labelledby="results-title"
      className={styles.resultsPanel}
      data-testid="imaging-results"
    >
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Calculated now</p>
        <h2 id="results-title">Imaging results</h2>
        <p>Full precision is retained; values below are rounded for display.</p>
      </div>
      {result ? (
        <ResultGrid>
          <ResultCard
            label="Sensor size"
            secondary={`${
              presentPhysicalLength(
                result.sensorDimensionsMm.diagonalMm,
                state.physicalDisplayUnit,
              ).text
            } diagonal`}
            value={`${
              presentPhysicalLength(
                result.sensorDimensionsMm.widthMm,
                state.physicalDisplayUnit,
              ).numberText
            } × ${
              presentPhysicalLength(
                result.sensorDimensionsMm.heightMm,
                state.physicalDisplayUnit,
              ).text
            }`}
          />
          <ResultCard
            label="Effective optics"
            secondary={`${
              presentPhysicalLength(
                result.effectiveFocalLengthMm,
                state.physicalDisplayUnit,
              ).text
            } focal length`}
            value={`f/${formatDecimal(result.effectiveFocalRatio, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}`}
          />
          <ResultCard
            interpretation="Tracking, focus, optics, processing, and target type also affect the useful sampling."
            label="Sampling"
            secondary={
              <>
                <span aria-hidden="true">
                  {formatDecimal(state.seeingFwhmArcsec, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  ″ stated seeing
                </span>
                <span className={styles.visuallyHidden}>
                  {formatDecimal(state.seeingFwhmArcsec, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  arcseconds stated seeing
                </span>
              </>
            }
            statusText={SAMPLING_ASSESSMENT_LABELS[result.samplingAssessment]}
            value={
              <>
                <span aria-hidden="true">
                  {formatDecimal(result.pixelsPerSeeingFwhm, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  output px / FWHM
                </span>
                <span className={styles.visuallyHidden}>
                  {formatDecimal(result.pixelsPerSeeingFwhm, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  output pixels per full width at half maximum
                </span>
              </>
            }
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

  const equations =
    result &&
    cameraSensor &&
    telescopeInputs.nativeFocalLengthMm !== null &&
    telescopeInputs.apertureMm !== null &&
    telescopeInputs.focalRatio !== null &&
    opticalMultipliers ? (
      <CalculationEquations
        apertureMm={telescopeInputs.apertureMm}
        binningFactor={Number(state.binning)}
        dispatch={dispatch}
        focalLengthMode={state.telescope.focalLengthMode}
        nativeFocalLengthMm={telescopeInputs.nativeFocalLengthMm}
        nativeFocalRatio={telescopeInputs.focalRatio}
        opticalMultipliers={opticalMultipliers}
        physicalDisplayUnit={state.physicalDisplayUnit}
        result={result}
        seeingFwhmArcsec={state.seeingFwhmArcsec}
        sensor={cameraSensor}
      />
    ) : null;

  return (
    <FieldOfViewShell
      controls={controls}
      equations={equations}
      notice={shareNotice}
      results={results}
      summary={summary}
      visualisation={visualisation}
    />
  );
}
