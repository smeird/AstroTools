"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { NumericInput } from "@/components/design-system/numeric-input";
import { MathExpression } from "@/components/equations";
import {
  applySharedImagingTrainWhenChanged,
  parseSharedImagingTrain,
  SHARED_IMAGING_TRAIN_KEY,
} from "@/features/shared-equipment/telescope-selection";
import { calculatePolarAlignmentDrift } from "@/lib/calculations";
import {
  parsePolarDrift,
  POLAR_DRIFT_PERSISTENCE_KEY,
  POLAR_DRIFT_TRAIN_APPLIED_KEY,
  serializePolarDrift,
  type PolarDriftValues,
} from "../model/persistence";
import styles from "./polar-alignment-drift-calculator.module.css";

const defaults: PolarDriftValues = {
  driftPixels: "10",
  durationMinutes: "5",
  effectiveFocalLengthMm: "1000",
  pixelSizeUm: "3.76",
  binningFactor: "1",
  latitudeDeg: "52",
  hourAngleDeg: "0",
};
const finite = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function PolarAlignmentDriftCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const raw = window.localStorage.getItem(POLAR_DRIFT_PERSISTENCE_KEY);
    const trainRaw = window.localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const applied = applySharedImagingTrainWhenChanged(
      raw ? (parsePolarDrift(raw) ?? defaults) : defaults,
      trainRaw ? parseSharedImagingTrain(trainRaw) : null,
      window.localStorage.getItem(POLAR_DRIFT_TRAIN_APPLIED_KEY),
      (current, train) => ({
        ...current,
        effectiveFocalLengthMm: train.effectiveFocalLengthMm,
        pixelSizeUm: train.pixelSizeUm,
        binningFactor: train.binningFactor,
      }),
    );
    startTransition(() => {
      setValues(applied.values);
      setLoaded(true);
    });
    if (applied.changed && applied.appliedSelection)
      window.localStorage.setItem(
        POLAR_DRIFT_TRAIN_APPLIED_KEY,
        applied.appliedSelection,
      );
  }, []);
  useEffect(() => {
    if (loaded)
      window.localStorage.setItem(
        POLAR_DRIFT_PERSISTENCE_KEY,
        serializePolarDrift(values),
      );
  }, [loaded, values]);
  const result = useMemo(() => {
    const input = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, finite(value)]),
    );
    if (Object.values(input).some((value) => value === null)) return null;
    try {
      return calculatePolarAlignmentDrift(input as never);
    } catch {
      return null;
    }
  }, [values]);
  const update = (field: keyof PolarDriftValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const error = (value: number | null) =>
    value === null
      ? "Low sensitivity at this hour angle"
      : `${format(Math.abs(value), 2)}′ (${value < 0 ? "negative" : "positive"} signed error)`;

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="polar-alignment-drift" />
      <header className={styles.intro}>
        <p className="eyebrow">Drift &amp; Polar Alignment</p>
        <h1>Turn measured drift into alignment error.</h1>
        <p className={styles.lede}>
          Measure signed north–south star movement over time. The configured
          full imaging train converts detector pixels into sky angle.
        </p>
      </header>
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="drift-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="drift-inputs">Measured drift and geometry</h2>
          </div>
          <div className={styles.inputGrid}>
            <NumericInput
              id="drift-pixels"
              label="Signed declination drift"
              name="driftPixels"
              unit="px"
              step="any"
              value={values.driftPixels}
              onValueChange={update("driftPixels")}
            />
            <NumericInput
              id="drift-duration"
              label="Measurement duration"
              name="durationMinutes"
              unit="min"
              min={0.1}
              step="any"
              value={values.durationMinutes}
              onValueChange={update("durationMinutes")}
            />
            <NumericInput
              id="drift-focal"
              label="Effective focal length"
              name="effectiveFocalLengthMm"
              unit="mm"
              min={1}
              step="any"
              value={values.effectiveFocalLengthMm}
              onValueChange={update("effectiveFocalLengthMm")}
            />
            <NumericInput
              id="drift-pixel-size"
              label="Camera pixel pitch"
              name="pixelSizeUm"
              unit="µm"
              min={0.1}
              step="any"
              value={values.pixelSizeUm}
              onValueChange={update("pixelSizeUm")}
            />
            <NumericInput
              id="drift-binning"
              label="Binning"
              name="binningFactor"
              unit="×"
              min={1}
              max={4}
              step={1}
              value={values.binningFactor}
              onValueChange={update("binningFactor")}
            />
            <NumericInput
              id="drift-latitude"
              label="Observer latitude"
              name="latitudeDeg"
              unit="°"
              min={-90}
              max={90}
              step="any"
              value={values.latitudeDeg}
              onValueChange={update("latitudeDeg")}
            />
            <NumericInput
              id="drift-hour-angle"
              label="Star hour angle"
              name="hourAngleDeg"
              unit="°"
              min={-180}
              max={180}
              step="any"
              value={values.hourAngleDeg}
              onValueChange={update("hourAngleDeg")}
            />
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="drift-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="drift-results">Alignment estimate</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Image scale</dt>
                  <dd>{format(result.imageScaleArcsecPerPixel, 3)}″ / px</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Sky drift rate</dt>
                  <dd>{format(result.driftRateArcsecPerMinute, 3)}″ / min</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Azimuth-axis error</dt>
                  <dd>{error(result.azimuthErrorArcmin)}</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Altitude-axis error</dt>
                  <dd>{error(result.altitudeErrorArcmin)}</dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equations</h3>
                <MathExpression label="Measured sky drift rate">
                  <mrow>
                    <msub>
                      <mi>d</mi>
                      <mi>sky</mi>
                    </msub>
                    <mo>=</mo>
                    <mfrac>
                      <mrow>
                        <msub>
                          <mi>d</mi>
                          <mi>px</mi>
                        </msub>
                        <mo>⁢</mo>
                        <mi>s</mi>
                      </mrow>
                      <mi>t</mi>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <MathExpression label="Small-angle polar error">
                  <mrow>
                    <mi>ε</mi>
                    <mo>≈</mo>
                    <mfrac>
                      <msub>
                        <mi>d</mi>
                        <mi>sky</mi>
                      </msub>
                      <mrow>
                        <mi>ω</mi>
                        <mo>⁢</mo>
                        <mi>S</mi>
                      </mrow>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <p>
                  For azimuth error, sensitivity S = cos(latitude) cos(hour
                  angle). For altitude error, S = sin(hour angle).
                </p>
              </div>
              <p className={styles.note}>
                Treat one axis at a time: near the meridian mainly tests
                azimuth; near six hours east or west mainly tests altitude.
                Camera orientation determines how a detector direction maps to
                north or south, so verify the sign before adjusting the mount.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter valid geometry and a positive duration, focal length, pixel
              pitch and binning.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
