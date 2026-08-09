"use client";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { CalculatorExplainer } from "@/components/design-system/calculator-explainer";
import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { EquipmentInheritanceNotice } from "@/components/design-system/equipment-inheritance-notice";
import { CalculatorLineDiagram } from "@/components/diagrams/calculator-line-diagram";
import { NumericInput } from "@/components/design-system/numeric-input";
import { MathExpression } from "@/components/equations";
import {
  applySharedImagingTrainWhenChanged,
  parseSharedImagingTrain,
  SHARED_IMAGING_TRAIN_KEY,
} from "@/features/shared-equipment/telescope-selection";
import { calculateMosaicPlanning } from "@/lib/calculations";
import {
  MOSAIC_PERSISTENCE_KEY,
  MOSAIC_TRAIN_APPLIED_KEY,
  parseMosaic,
  serializeMosaic,
  type MosaicValues,
} from "../model/persistence";
import styles from "./mosaic-planning-calculator.module.css";

const defaults: MosaicValues = {
  effectiveFocalLengthMm: "700",
  sensorWidthMm: "23.5",
  sensorHeightMm: "15.7",
  targetWidthDeg: "5",
  targetHeightDeg: "3",
  overlapPercent: "15",
  hoursPerPanel: "2",
};
const format = (n: number, d = 2) =>
  n.toLocaleString("en-GB", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function MosaicPlanningCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [equipmentLabel, setEquipmentLabel] = useState<string | null>(null);
  const trainMarker = useRef<string | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(MOSAIC_PERSISTENCE_KEY);
    const trainRaw = localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const train = trainRaw ? parseSharedImagingTrain(trainRaw) : null;
    const applied = applySharedImagingTrainWhenChanged(
      raw ? (parseMosaic(raw) ?? defaults) : defaults,
      train,
      localStorage.getItem(MOSAIC_TRAIN_APPLIED_KEY),
      (current, train) => ({
        ...current,
        effectiveFocalLengthMm: train.effectiveFocalLengthMm,
        sensorWidthMm: train.sensorWidthMm,
        sensorHeightMm: train.sensorHeightMm,
      }),
    );
    startTransition(() => {
      setValues(applied.values);
      setEquipmentLabel(train?.rigName || train?.telescopeLabel || null);
      setLoaded(true);
    });
    trainMarker.current = applied.changed ? applied.appliedSelection : null;
  }, []);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(MOSAIC_PERSISTENCE_KEY, serializeMosaic(values));
    if (loaded && trainMarker.current)
      localStorage.setItem(MOSAIC_TRAIN_APPLIED_KEY, trainMarker.current);
  }, [loaded, values]);
  const result = useMemo(() => {
    const input = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, Number(v)]),
    );
    if (Object.values(input).some((v) => !Number.isFinite(v))) return null;
    try {
      return calculateMosaicPlanning(input as never);
    } catch {
      return null;
    }
  }, [values]);
  const update = (field: keyof MosaicValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="mosaic-planning" />
      <header className={styles.intro}>
        <p className="eyebrow">Mosaic Planning</p>
        <h1>Cover the target without leaving seams.</h1>
        <p className={styles.lede}>
          Use the complete optical train and sensor to turn a target’s angular
          size into an overlapping panel grid and integration budget.
        </p>
      </header>
      <CalculatorExplainer
        slug="mosaic-planning"
        guidance="The saved focal length and sensor dimensions set each panel's exact field. Target extent, overlap and integration per panel remain specific to this mosaic."
      />
      <CalculatorLineDiagram kind="mosaic-planning" />
      <EquipmentInheritanceNotice
        appliedFields={[
          "effective focal length",
          "sensor width",
          "sensor height",
        ]}
        equipmentLabel={equipmentLabel}
      />
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="mosaic-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="mosaic-inputs">Frame and target</h2>
          </div>
          <div className={styles.inputGrid}>
            <NumericInput
              id="mosaic-focal"
              label="Effective focal length"
              name="effectiveFocalLengthMm"
              unit="mm"
              min={1}
              step="any"
              value={values.effectiveFocalLengthMm}
              onValueChange={update("effectiveFocalLengthMm")}
            />
            <NumericInput
              id="mosaic-width"
              label="Sensor width"
              name="sensorWidthMm"
              unit="mm"
              min={0.1}
              step="any"
              value={values.sensorWidthMm}
              onValueChange={update("sensorWidthMm")}
            />
            <NumericInput
              id="mosaic-height"
              label="Sensor height"
              name="sensorHeightMm"
              unit="mm"
              min={0.1}
              step="any"
              value={values.sensorHeightMm}
              onValueChange={update("sensorHeightMm")}
            />
            <NumericInput
              id="target-width"
              label="Target width"
              name="targetWidthDeg"
              unit="°"
              min={0.001}
              step="any"
              value={values.targetWidthDeg}
              onValueChange={update("targetWidthDeg")}
            />
            <NumericInput
              id="target-height"
              label="Target height"
              name="targetHeightDeg"
              unit="°"
              min={0.001}
              step="any"
              value={values.targetHeightDeg}
              onValueChange={update("targetHeightDeg")}
            />
            <NumericInput
              id="mosaic-overlap"
              label="Panel overlap"
              name="overlapPercent"
              unit="%"
              min={0}
              max={95}
              step="any"
              value={values.overlapPercent}
              onValueChange={update("overlapPercent")}
            />
            <NumericInput
              id="panel-hours"
              label="Integration per panel"
              name="hoursPerPanel"
              unit="h"
              min={0.01}
              step="any"
              value={values.hoursPerPanel}
              onValueChange={update("hoursPerPanel")}
            />
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="mosaic-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="mosaic-results">Panel plan</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Grid</dt>
                  <dd>
                    {result.columns} × {result.rows}
                    <span>{result.panelCount} panels</span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Single panel</dt>
                  <dd>
                    {format(result.panelWidthDeg)}° ×{" "}
                    {format(result.panelHeightDeg)}°
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Achieved coverage</dt>
                  <dd>
                    {format(result.achievedWidthDeg)}° ×{" "}
                    {format(result.achievedHeightDeg)}°
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Total integration</dt>
                  <dd>{format(result.totalIntegrationHours, 1)} h</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Adjacent overlap</dt>
                  <dd>
                    {format(result.horizontalOverlapDeg * 60, 1)}′ ×{" "}
                    {format(result.verticalOverlapDeg * 60, 1)}′
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Edge margin</dt>
                  <dd>
                    {format(result.horizontalMarginDeg * 60, 1)}′ ×{" "}
                    {format(result.verticalMarginDeg * 60, 1)}′
                  </dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equations</h3>
                <MathExpression label="Panel count along one axis">
                  <mrow>
                    <mi>n</mi>
                    <mo>=</mo>
                    <mo>⌈</mo>
                    <mn>1</mn>
                    <mo>+</mo>
                    <mfrac>
                      <mrow>
                        <mi>T</mi>
                        <mo>−</mo>
                        <mi>F</mi>
                      </mrow>
                      <mrow>
                        <mi>F</mi>
                        <mo>⁢</mo>
                        <mo>(</mo>
                        <mn>1</mn>
                        <mo>−</mo>
                        <mi>o</mi>
                        <mo>)</mo>
                      </mrow>
                    </mfrac>
                    <mo>⌉</mo>
                  </mrow>
                </MathExpression>
                <p>
                  T is target extent, F is one panel’s exact field and o is
                  fractional overlap. Counts never fall below one.
                </p>
              </div>
              <p className={styles.note}>
                This rectangular plan assumes target and sensor axes are
                aligned. Allow extra margin for rotation, plate-solving error,
                dithering, distortion, stacking crops and imperfect camera-angle
                repeatability.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter positive train, target and integration values with overlap
              below 100%.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
