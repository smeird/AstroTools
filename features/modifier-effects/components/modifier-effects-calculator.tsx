"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { CalculatorLineDiagram } from "@/components/diagrams/calculator-line-diagram";
import { NumericInput } from "@/components/design-system/numeric-input";
import { SharedTelescopeNotice } from "@/components/design-system/shared-telescope-notice";
import { MathExpression } from "@/components/equations";
import {
  applySharedTelescopeWhenChanged,
  applySharedCameraWhenChanged,
  applySharedImagingTrainWhenChanged,
  parseSharedCameraSelection,
  parseSharedImagingTrain,
  parseSharedTelescopeSelection,
  SHARED_CAMERA_SELECTION_KEY,
  SHARED_IMAGING_TRAIN_KEY,
  SHARED_TELESCOPE_SELECTION_KEY,
  type SharedTelescopeSelection,
} from "@/features/shared-equipment/telescope-selection";
import { calculateModifierEffects } from "@/lib/calculations";

import {
  MODIFIER_EFFECTS_PERSISTENCE_KEY,
  MODIFIER_CAMERA_APPLIED_KEY,
  MODIFIER_TELESCOPE_APPLIED_KEY,
  MODIFIER_TRAIN_APPLIED_KEY,
  parseModifierEffects,
  serializeModifierEffects,
  type ModifierEffectsValues,
} from "../model/persistence";
import styles from "./modifier-effects-calculator.module.css";

const defaults: ModifierEffectsValues = {
  nativeFocalLengthMm: "1000",
  apertureMm: "200",
  modifierFactor: "0.7",
  sensorWidthMm: "23.5",
  sensorHeightMm: "15.7",
  pixelSizeUm: "3.76",
  binningFactor: "1",
};
const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export function ModifierEffectsCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [sharedTelescope, setSharedTelescope] =
    useState<SharedTelescopeSelection | null>(null);
  useEffect(() => {
    const stored = window.localStorage.getItem(
      MODIFIER_EFFECTS_PERSISTENCE_KEY,
    );
    const restored = stored ? parseModifierEffects(stored) : null;
    const sharedRaw = window.localStorage.getItem(
      SHARED_TELESCOPE_SELECTION_KEY,
    );
    const shared = sharedRaw ? parseSharedTelescopeSelection(sharedRaw) : null;
    const sharedCameraRaw = window.localStorage.getItem(
      SHARED_CAMERA_SELECTION_KEY,
    );
    const sharedCamera = sharedCameraRaw
      ? parseSharedCameraSelection(sharedCameraRaw)
      : null;
    const applied = applySharedTelescopeWhenChanged(
      restored ?? defaults,
      shared,
      window.localStorage.getItem(MODIFIER_TELESCOPE_APPLIED_KEY),
      (current, telescope) => ({
        ...current,
        nativeFocalLengthMm: telescope.nativeFocalLengthMm,
        apertureMm: telescope.apertureMm,
      }),
    );
    const cameraApplied = applySharedCameraWhenChanged(
      applied.values,
      sharedCamera,
      window.localStorage.getItem(MODIFIER_CAMERA_APPLIED_KEY),
      (current, camera) => ({
        ...current,
        sensorWidthMm: camera.sensorWidthMm,
        sensorHeightMm: camera.sensorHeightMm,
        pixelSizeUm: camera.pixelSizeUm,
      }),
    );
    const trainRaw = window.localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const trainApplied = applySharedImagingTrainWhenChanged(
      cameraApplied.values,
      trainRaw ? parseSharedImagingTrain(trainRaw) : null,
      window.localStorage.getItem(MODIFIER_TRAIN_APPLIED_KEY),
      (current, train) => ({
        ...current,
        nativeFocalLengthMm: train.nativeFocalLengthMm,
        apertureMm: train.apertureMm,
        modifierFactor: train.opticalMultiplier,
        sensorWidthMm: train.sensorWidthMm,
        sensorHeightMm: train.sensorHeightMm,
        pixelSizeUm: train.pixelSizeUm,
        binningFactor: train.binningFactor,
      }),
    );
    startTransition(() => {
      setValues(trainApplied.values);
      setSharedTelescope(shared);
      setLoaded(true);
    });
    if (applied.changed && applied.appliedSelection) {
      window.localStorage.setItem(
        MODIFIER_TELESCOPE_APPLIED_KEY,
        applied.appliedSelection,
      );
    }
    if (cameraApplied.changed && cameraApplied.appliedSelection)
      window.localStorage.setItem(
        MODIFIER_CAMERA_APPLIED_KEY,
        cameraApplied.appliedSelection,
      );
    if (trainApplied.changed && trainApplied.appliedSelection)
      window.localStorage.setItem(
        MODIFIER_TRAIN_APPLIED_KEY,
        trainApplied.appliedSelection,
      );
  }, []);
  useEffect(() => {
    if (loaded)
      window.localStorage.setItem(
        MODIFIER_EFFECTS_PERSISTENCE_KEY,
        serializeModifierEffects(values),
      );
  }, [loaded, values]);
  const result = useMemo(() => {
    const input = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, number(value)]),
    );
    if (Object.values(input).some((value) => value === null)) return null;
    return calculateModifierEffects(input as never);
  }, [values]);
  const update = (field: keyof ModifierEffectsValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="modifier-effects" />
      <header className={styles.intro}>
        <p className="eyebrow">Focal Reducer &amp; Barlow Effects</p>
        <h1>See exactly what the glass changes.</h1>
        <p className={styles.lede}>
          Compare a native optical system with one reducer, field flattener, or
          Barlow factor. Every result updates locally as you change the factor.
        </p>
      </header>
      <CalculatorLineDiagram kind="modifier-effects" />
      <SharedTelescopeNotice selection={sharedTelescope} used />
      <div className={styles.workspace}>
        <section
          className={styles.panel}
          aria-labelledby="modifier-inputs-title"
        >
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="modifier-inputs-title">Optical path</h2>
            <p>
              Enter the native telescope, sensor, and the modifier&apos;s
              dimensionless factor.
            </p>
          </div>
          <div className={styles.inputGrid}>
            <NumericInput
              id="modifier-focal-length"
              label="Native focal length"
              name="nativeFocalLengthMm"
              unit="mm"
              min={1}
              max={100000}
              step="any"
              value={values.nativeFocalLengthMm}
              onValueChange={update("nativeFocalLengthMm")}
            />
            <NumericInput
              id="modifier-aperture"
              label="Aperture"
              name="apertureMm"
              unit="mm"
              min={1}
              max={10000}
              step="any"
              value={values.apertureMm}
              onValueChange={update("apertureMm")}
            />
            <NumericInput
              id="modifier-factor"
              label="Modifier factor"
              name="modifierFactor"
              unit="×"
              min={0.1}
              max={10}
              step="any"
              value={values.modifierFactor}
              onValueChange={update("modifierFactor")}
              description="Below 1× reduces focal length; above 1× increases it."
            />
            <NumericInput
              id="modifier-pixel-size"
              label="Pixel pitch"
              name="pixelSizeUm"
              unit="µm"
              min={0.1}
              max={100}
              step="any"
              value={values.pixelSizeUm}
              onValueChange={update("pixelSizeUm")}
            />
            <NumericInput
              id="modifier-sensor-width"
              label="Sensor width"
              name="sensorWidthMm"
              unit="mm"
              min={0.1}
              max={1000}
              step="any"
              value={values.sensorWidthMm}
              onValueChange={update("sensorWidthMm")}
            />
            <NumericInput
              id="modifier-sensor-height"
              label="Sensor height"
              name="sensorHeightMm"
              unit="mm"
              min={0.1}
              max={1000}
              step="any"
              value={values.sensorHeightMm}
              onValueChange={update("sensorHeightMm")}
            />
            <NumericInput
              id="modifier-binning"
              label="Binning"
              name="binningFactor"
              unit="×"
              min={1}
              max={4}
              step={1}
              value={values.binningFactor}
              onValueChange={update("binningFactor")}
            />
          </div>
        </section>
        <section
          className={styles.panel}
          aria-labelledby="modifier-results-title"
        >
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="modifier-results-title">Native versus modified</h2>
            <p>
              The aperture stays fixed; the modifier changes effective focal
              length and everything derived from it.
            </p>
          </div>
          {result ? (
            <>
              <div className={styles.results}>
                <dl className={styles.card}>
                  <dt>Native focal length</dt>
                  <dd>
                    {format(result.native.focalLengthMm, 0)} mm
                    <span className={styles.secondary}>
                      f/{format(result.native.focalRatio, 1)}
                    </span>
                  </dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Modified focal length</dt>
                  <dd>
                    {format(result.modified.focalLengthMm, 0)} mm
                    <span className={styles.secondary}>
                      f/{format(result.modified.focalRatio, 1)}
                    </span>
                  </dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Native field</dt>
                  <dd>
                    {format(result.native.fieldOfViewDeg.horizontalDeg, 2)}° ×{" "}
                    {format(result.native.fieldOfViewDeg.verticalDeg, 2)}°
                    <span className={styles.secondary}>
                      {format(result.native.imageScaleArcsecPerPixel, 3)}″ / px
                    </span>
                  </dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Modified field</dt>
                  <dd>
                    {format(result.modified.fieldOfViewDeg.horizontalDeg, 2)}° ×{" "}
                    {format(result.modified.fieldOfViewDeg.verticalDeg, 2)}°
                    <span className={styles.secondary}>
                      {format(result.modified.imageScaleArcsecPerPixel, 3)}″ /
                      px
                    </span>
                  </dd>
                </dl>
              </div>
              <div className={styles.compare}>
                <h3>What changed</h3>
                <p>
                  Focal length changed by{" "}
                  {format(result.focalLengthChangePercent, 1)}%; image scale
                  changed by {format(result.imageScaleChangePercent, 1)}%. A
                  reducer widens the field and increases arcseconds per pixel; a
                  Barlow does the opposite.
                </p>
                <MathExpression label="Modified focal length">
                  <mrow>
                    <msub>
                      <mi>f</mi>
                      <mi>modified</mi>
                    </msub>
                    <mo>=</mo>
                    <msub>
                      <mi>f</mi>
                      <mi>native</mi>
                    </msub>
                    <mo>⁢</mo>
                    <mi>m</mi>
                  </mrow>
                </MathExpression>
                <MathExpression label="Exact angular field">
                  <mrow>
                    <mi>θ</mi>
                    <mo>=</mo>
                    <mn>2</mn>
                    <mo>⁢</mo>
                    <mi>atan</mi>
                    <mo>(</mo>
                    <mfrac>
                      <mi>d</mi>
                      <mrow>
                        <mn>2</mn>
                        <mo>⁢</mo>
                        <mi>f</mi>
                      </mrow>
                    </mfrac>
                    <mo>)</mo>
                  </mrow>
                </MathExpression>
              </div>
              <p className={styles.note}>
                The calculator models the stated multiplier as ideal. Real
                reducers and Barlows can introduce aberration, vignetting,
                spacing sensitivity, and illumination changes.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter positive values in every field to calculate the comparison.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
