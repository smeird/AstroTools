"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { NumericInput } from "@/components/design-system/numeric-input";
import { SharedTelescopeNotice } from "@/components/design-system/shared-telescope-notice";
import { MathExpression } from "@/components/equations";
import {
  applySharedCameraWhenChanged,
  applySharedImagingTrainWhenChanged,
  applySharedTelescopeWhenChanged,
  parseSharedCameraSelection,
  parseSharedImagingTrain,
  parseSharedTelescopeSelection,
  SHARED_CAMERA_SELECTION_KEY,
  SHARED_IMAGING_TRAIN_KEY,
  SHARED_TELESCOPE_SELECTION_KEY,
  type SharedTelescopeSelection,
} from "@/features/shared-equipment/telescope-selection";
import { calculateGuidingRatio } from "@/lib/calculations";

import {
  GUIDING_CAMERA_APPLIED_KEY,
  GUIDING_RATIO_PERSISTENCE_KEY,
  GUIDING_TELESCOPE_APPLIED_KEY,
  GUIDING_TRAIN_APPLIED_KEY,
  parseGuidingRatio,
  serializeGuidingRatio,
  type GuidingRatioValues,
} from "../model/persistence";
import styles from "./guiding-ratio-calculator.module.css";

const defaults: GuidingRatioValues = {
  imagingFocalLengthMm: "1000",
  imagingPixelSizeUm: "3.76",
  imagingBinning: "1",
  guideFocalLengthMm: "240",
  guidePixelSizeUm: "3.75",
  guideBinning: "1",
};

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function GuidingRatioCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [sharedTelescope, setSharedTelescope] =
    useState<SharedTelescopeSelection | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(GUIDING_RATIO_PERSISTENCE_KEY);
    const restored = stored ? parseGuidingRatio(stored) : null;
    const telescopeRaw = window.localStorage.getItem(
      SHARED_TELESCOPE_SELECTION_KEY,
    );
    const telescope = telescopeRaw
      ? parseSharedTelescopeSelection(telescopeRaw)
      : null;
    const cameraRaw = window.localStorage.getItem(SHARED_CAMERA_SELECTION_KEY);
    const camera = cameraRaw ? parseSharedCameraSelection(cameraRaw) : null;
    const telescopeApplied = applySharedTelescopeWhenChanged(
      restored ?? defaults,
      telescope,
      window.localStorage.getItem(GUIDING_TELESCOPE_APPLIED_KEY),
      (current, selected) => ({
        ...current,
        imagingFocalLengthMm: selected.nativeFocalLengthMm,
      }),
    );
    const cameraApplied = applySharedCameraWhenChanged(
      telescopeApplied.values,
      camera,
      window.localStorage.getItem(GUIDING_CAMERA_APPLIED_KEY),
      (current, selected) => ({
        ...current,
        imagingPixelSizeUm: selected.pixelSizeUm,
      }),
    );
    const trainRaw = window.localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const trainApplied = applySharedImagingTrainWhenChanged(
      cameraApplied.values,
      trainRaw ? parseSharedImagingTrain(trainRaw) : null,
      window.localStorage.getItem(GUIDING_TRAIN_APPLIED_KEY),
      (current, train) => ({
        ...current,
        imagingFocalLengthMm: train.effectiveFocalLengthMm,
        imagingPixelSizeUm: train.pixelSizeUm,
        imagingBinning: train.binningFactor,
      }),
    );
    startTransition(() => {
      setValues(trainApplied.values);
      setSharedTelescope(telescope);
      setLoaded(true);
    });
    if (telescopeApplied.changed && telescopeApplied.appliedSelection)
      window.localStorage.setItem(
        GUIDING_TELESCOPE_APPLIED_KEY,
        telescopeApplied.appliedSelection,
      );
    if (cameraApplied.changed && cameraApplied.appliedSelection)
      window.localStorage.setItem(
        GUIDING_CAMERA_APPLIED_KEY,
        cameraApplied.appliedSelection,
      );
    if (trainApplied.changed && trainApplied.appliedSelection)
      window.localStorage.setItem(
        GUIDING_TRAIN_APPLIED_KEY,
        trainApplied.appliedSelection,
      );
  }, []);

  useEffect(() => {
    if (loaded)
      window.localStorage.setItem(
        GUIDING_RATIO_PERSISTENCE_KEY,
        serializeGuidingRatio(values),
      );
  }, [loaded, values]);

  const result = useMemo(() => {
    const input = {
      imagingFocalLengthMm: number(values.imagingFocalLengthMm),
      imagingPixelSizeUm: number(values.imagingPixelSizeUm),
      imagingBinning: number(values.imagingBinning),
      guideFocalLengthMm: number(values.guideFocalLengthMm),
      guidePixelSizeUm: number(values.guidePixelSizeUm),
      guideBinning: number(values.guideBinning),
    };
    if (Object.values(input).some((value) => value === null)) return null;
    return calculateGuidingRatio(input as Record<keyof typeof input, number>);
  }, [values]);
  const update = (field: keyof GuidingRatioValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="guiding-ratio" />
      <header className={styles.intro}>
        <p className="eyebrow">Guiding Ratio</p>
        <h1>Match the guider to the imaging train.</h1>
        <p className={styles.lede}>
          Compare the angular scale of the main camera with the guide camera and
          see the centroid precision needed to hold an imaging pixel.
        </p>
      </header>
      <SharedTelescopeNotice selection={sharedTelescope} used />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="guiding-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="guiding-inputs">Two optical paths</h2>
          </div>
          <div className={styles.inputGroup}>
            <h3>Main imaging train</h3>
            <div className={styles.inputGrid}>
              <NumericInput
                id="imaging-focal"
                label="Imaging focal length"
                name="imagingFocalLengthMm"
                unit="mm"
                min={1}
                max={100000}
                step="any"
                value={values.imagingFocalLengthMm}
                onValueChange={update("imagingFocalLengthMm")}
              />
              <NumericInput
                id="imaging-pixel"
                label="Imaging pixel pitch"
                name="imagingPixelSizeUm"
                unit="µm"
                min={0.1}
                max={100}
                step="any"
                value={values.imagingPixelSizeUm}
                onValueChange={update("imagingPixelSizeUm")}
              />
              <NumericInput
                id="imaging-binning"
                label="Imaging binning"
                name="imagingBinning"
                unit="×"
                min={1}
                max={4}
                step={1}
                value={values.imagingBinning}
                onValueChange={update("imagingBinning")}
              />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <h3>Guide train</h3>
            <div className={styles.inputGrid}>
              <NumericInput
                id="guide-focal"
                label="Guide focal length"
                name="guideFocalLengthMm"
                unit="mm"
                min={1}
                max={100000}
                step="any"
                value={values.guideFocalLengthMm}
                onValueChange={update("guideFocalLengthMm")}
              />
              <NumericInput
                id="guide-pixel"
                label="Guide pixel pitch"
                name="guidePixelSizeUm"
                unit="µm"
                min={0.1}
                max={100}
                step="any"
                value={values.guidePixelSizeUm}
                onValueChange={update("guidePixelSizeUm")}
              />
              <NumericInput
                id="guide-binning"
                label="Guide binning"
                name="guideBinning"
                unit="×"
                min={1}
                max={4}
                step={1}
                value={values.guideBinning}
                onValueChange={update("guideBinning")}
              />
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="guiding-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="guiding-results">Scale and demand</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Imaging scale</dt>
                  <dd>{format(result.imagingScaleArcsecPerPixel, 3)}″ / px</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Guide scale</dt>
                  <dd>{format(result.guideScaleArcsecPerPixel, 3)}″ / px</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Guide : imaging ratio</dt>
                  <dd>
                    {format(result.guideToImagingRatio, 2)} : 1
                    <span>angular scale per pixel</span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Half-pixel demand</dt>
                  <dd>
                    {format(result.guideCentroidPixelsForHalfImagingPixel, 3)}{" "}
                    guide px
                    <span>
                      {format(result.imagingScaleArcsecPerPixel / 2, 3)}″ on sky
                    </span>
                  </dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equations</h3>
                <MathExpression label="Image scale for each optical path">
                  <mrow>
                    <mi>s</mi>
                    <mo>=</mo>
                    <mn>206.265</mn>
                    <mo>⁢</mo>
                    <mfrac>
                      <mrow>
                        <mi>p</mi>
                        <mo>⁢</mo>
                        <mi>b</mi>
                      </mrow>
                      <mi>f</mi>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <MathExpression label="Guide to imaging scale ratio">
                  <mrow>
                    <mi>R</mi>
                    <mo>=</mo>
                    <mfrac>
                      <msub>
                        <mi>s</mi>
                        <mi>guide</mi>
                      </msub>
                      <msub>
                        <mi>s</mi>
                        <mi>image</mi>
                      </msub>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <p>
                  A guide star centroid can be measured to a fraction of a guide
                  pixel, so the ratio alone is not a pass/fail rule.
                </p>
              </div>
              <p className={styles.note}>
                Guide-star signal, seeing, exposure time, mount response,
                flexure, calibration and software settings often matter more
                than a single ratio. An off-axis guider can also avoid
                differential flexure.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter a positive value in every field to calculate the result.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
