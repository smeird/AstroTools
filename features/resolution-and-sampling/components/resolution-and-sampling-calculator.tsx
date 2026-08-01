"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { NumericInput } from "@/components/design-system/numeric-input";
import { SharedTelescopeNotice } from "@/components/design-system/shared-telescope-notice";
import { MathExpression } from "@/components/equations";
import {
  applySharedTelescopeWhenChanged,
  applySharedCameraWhenChanged,
  parseSharedCameraSelection,
  parseSharedTelescopeSelection,
  SHARED_CAMERA_SELECTION_KEY,
  SHARED_TELESCOPE_SELECTION_KEY,
  type SharedTelescopeSelection,
} from "@/features/shared-equipment/telescope-selection";
import {
  calculateResolutionAndSampling,
  classifyResolutionSampling,
} from "@/lib/calculations";
import type { ResolutionAndSamplingInput } from "@/lib/calculations";

import {
  parseResolutionAndSamplingState,
  RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY,
  RESOLUTION_CAMERA_APPLIED_KEY,
  RESOLUTION_TELESCOPE_APPLIED_KEY,
  serializeResolutionAndSamplingState,
} from "../model/persistence";
import styles from "./resolution-and-sampling-calculator.module.css";

const defaults = {
  apertureMm: "200",
  wavelengthNm: "550",
  focalLengthMm: "1000",
  pixelSizeUm: "3.76",
  binningFactor: "1",
  seeingFwhmArcsec: "2",
};

function parse(value: string): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function format(value: number, digits = 2): string {
  return value.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function ResolutionAndSamplingCalculator() {
  const [values, setValues] = useState(defaults);
  const [persistedStateLoaded, setPersistedStateLoaded] = useState(false);
  const [sharedTelescope, setSharedTelescope] =
    useState<SharedTelescopeSelection | null>(null);
  useEffect(() => {
    const stored = window.localStorage.getItem(
      RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY,
    );
    const restored = stored ? parseResolutionAndSamplingState(stored) : null;
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
      window.localStorage.getItem(RESOLUTION_TELESCOPE_APPLIED_KEY),
      (current, telescope) => ({
        ...current,
        apertureMm: telescope.apertureMm,
        focalLengthMm: telescope.nativeFocalLengthMm,
      }),
    );
    const cameraApplied = applySharedCameraWhenChanged(
      applied.values,
      sharedCamera,
      window.localStorage.getItem(RESOLUTION_CAMERA_APPLIED_KEY),
      (current, camera) => ({ ...current, pixelSizeUm: camera.pixelSizeUm }),
    );
    startTransition(() => {
      setValues(cameraApplied.values);
      setSharedTelescope(shared);
      setPersistedStateLoaded(true);
    });
    if (applied.changed && applied.appliedSelection) {
      window.localStorage.setItem(
        RESOLUTION_TELESCOPE_APPLIED_KEY,
        applied.appliedSelection,
      );
    }
    if (cameraApplied.changed && cameraApplied.appliedSelection)
      window.localStorage.setItem(
        RESOLUTION_CAMERA_APPLIED_KEY,
        cameraApplied.appliedSelection,
      );
  }, []);
  useEffect(() => {
    if (persistedStateLoaded) {
      window.localStorage.setItem(
        RESOLUTION_AND_SAMPLING_PERSISTENCE_KEY,
        serializeResolutionAndSamplingState(values),
      );
    }
  }, [persistedStateLoaded, values]);
  const result = useMemo(() => {
    const input = {
      apertureMm: parse(values.apertureMm),
      wavelengthNm: parse(values.wavelengthNm),
      focalLengthMm: parse(values.focalLengthMm),
      pixelSizeUm: parse(values.pixelSizeUm),
      binningFactor: parse(values.binningFactor),
      seeingFwhmArcsec: parse(values.seeingFwhmArcsec),
    };

    if (Object.values(input).some((value) => value === null)) return null;
    return calculateResolutionAndSampling(input as ResolutionAndSamplingInput);
  }, [values]);

  const update = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const assessment = result
    ? classifyResolutionSampling(result.pixelsPerRayleighLimit)
    : null;

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="resolution-and-sampling" />
      <header className={styles.intro}>
        <p className="eyebrow">Resolution and Sampling</p>
        <h1>Know what the aperture can resolve.</h1>
        <p className={styles.lede}>
          Compare the telescope&apos;s diffraction limit with your camera
          sampling and local seeing. Change any input to see the consequences
          immediately.
        </p>
      </header>
      <SharedTelescopeNotice selection={sharedTelescope} used />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="inputs-title">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="inputs-title">Optical path</h2>
            <p>Use physical dimensions and canonical units for the estimate.</p>
          </div>
          <div className={styles.inputs}>
            <div className={styles.inputGrid}>
              <NumericInput
                id="resolution-aperture"
                label="Aperture"
                name="apertureMm"
                unit="mm"
                min={1}
                max={10_000}
                step="any"
                value={values.apertureMm}
                onValueChange={update("apertureMm")}
              />
              <NumericInput
                id="resolution-wavelength"
                label="Wavelength"
                name="wavelengthNm"
                unit="nm"
                min={100}
                max={2_000}
                step="any"
                value={values.wavelengthNm}
                onValueChange={update("wavelengthNm")}
              />
              <NumericInput
                id="resolution-focal-length"
                label="Focal length"
                name="focalLengthMm"
                unit="mm"
                min={1}
                max={100_000}
                step="any"
                value={values.focalLengthMm}
                onValueChange={update("focalLengthMm")}
              />
              <NumericInput
                id="resolution-pixel-size"
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
                id="resolution-binning"
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
                id="resolution-seeing"
                label="Seeing FWHM"
                name="seeingFwhmArcsec"
                unit="arcsec"
                min={0.1}
                max={20}
                step="any"
                value={values.seeingFwhmArcsec}
                onValueChange={update("seeingFwhmArcsec")}
              />
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="results-title">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="results-title">Resolution and sampling</h2>
            <p>
              These are ideal optical estimates, not a guarantee of image
              detail.
            </p>
          </div>
          {result && assessment ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Rayleigh limit</dt>
                  <dd>
                    {format(result.rayleighLimitArcsec, 3)}″
                    <span className={styles.secondary}>
                      at {format(Number(values.wavelengthNm), 0)} nm
                    </span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Dawes estimate</dt>
                  <dd>
                    {format(result.dawesLimitArcsec, 3)}″
                    <span className={styles.secondary}>
                      empirical double-star limit
                    </span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Image scale</dt>
                  <dd>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ / px
                    <span className={styles.secondary}>
                      {format(result.effectivePixelSizeUm, 2)} µm effective
                      pitch
                    </span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Pixels per Rayleigh limit</dt>
                  <dd>
                    {format(result.pixelsPerRayleighLimit, 2)}
                    <span className={styles.status}>{assessment}</span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Pixels per seeing FWHM</dt>
                  <dd>
                    {format(result.pixelsPerSeeingFwhm, 2)}
                    <span className={styles.secondary}>
                      for {format(Number(values.seeingFwhmArcsec), 1)}″ seeing
                    </span>
                  </dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Critical focal ratio</dt>
                  <dd>
                    f/{format(result.criticalFocalRatio, 1)}
                    <span className={styles.secondary}>
                      {format(result.criticalFocalLengthMm, 0)} mm for 2 px
                    </span>
                  </dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equations</h3>
                <MathExpression label="Rayleigh diffraction limit">
                  <mrow>
                    <msub>
                      <mi>θ</mi>
                      <mi>R</mi>
                    </msub>
                    <mo>=</mo>
                    <mn>1.22</mn>
                    <mo>⁢</mo>
                    <mfrac>
                      <mi>λ</mi>
                      <mi>D</mi>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <MathExpression label="Image scale">
                  <mrow>
                    <mi>s</mi>
                    <mo>=</mo>
                    <mn>206.265</mn>
                    <mo>⁢</mo>
                    <mfrac>
                      <msub>
                        <mi>p</mi>
                        <mi>eff</mi>
                      </msub>
                      <mi>f</mi>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <p>
                  The Rayleigh limit is the ideal diffraction separation. The
                  detector samples that scale with the image scale; two pixels
                  per Rayleigh limit is the minimum target used here, while
                  seeing usually becomes the practical limit from the ground.
                </p>
              </div>
              <p className={styles.note}>
                Atmospheric turbulence, focus, obstruction, tracking, contrast,
                processing, and target brightness can all reduce real-world
                resolution. Treat these outputs as planning guidance.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter positive values in every field to calculate the result.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
