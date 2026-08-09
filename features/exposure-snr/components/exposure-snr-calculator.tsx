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
import { calculateExposureSnr } from "@/lib/calculations";
import {
  EXPOSURE_SNR_PERSISTENCE_KEY,
  EXPOSURE_SNR_TRAIN_APPLIED_KEY,
  parseExposureSnr,
  serializeExposureSnr,
  type ExposureSnrValues,
} from "../model/persistence";
import styles from "./exposure-snr-calculator.module.css";

const defaults: ExposureSnrValues = {
  effectiveFocalLengthMm: "700",
  pixelSizeUm: "3.76",
  binningFactor: "1",
  sourceRateElectronsPerSecPerArcsec2: "0.5",
  skyRateElectronsPerSecPerArcsec2: "1",
  darkCurrentElectronsPerSecPerPixel: "0.01",
  readNoiseElectrons: "2",
  subExposureSeconds: "120",
  frameCount: "30",
};
const format = (n: number, d = 2) =>
  n.toLocaleString("en-GB", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function ExposureSnrCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [equipmentLabel, setEquipmentLabel] = useState<string | null>(null);
  const trainMarker = useRef<string | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(EXPOSURE_SNR_PERSISTENCE_KEY);
    const trainRaw = localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const train = trainRaw ? parseSharedImagingTrain(trainRaw) : null;
    const applied = applySharedImagingTrainWhenChanged(
      raw ? (parseExposureSnr(raw) ?? defaults) : defaults,
      train,
      localStorage.getItem(EXPOSURE_SNR_TRAIN_APPLIED_KEY),
      (current, train) => ({
        ...current,
        effectiveFocalLengthMm: train.effectiveFocalLengthMm,
        pixelSizeUm: train.pixelSizeUm,
        binningFactor: train.binningFactor,
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
      localStorage.setItem(
        EXPOSURE_SNR_PERSISTENCE_KEY,
        serializeExposureSnr(values),
      );
    if (loaded && trainMarker.current)
      localStorage.setItem(EXPOSURE_SNR_TRAIN_APPLIED_KEY, trainMarker.current);
  }, [loaded, values]);
  const result = useMemo(() => {
    const input = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, Number(v)]),
    );
    if (Object.values(input).some((v) => !Number.isFinite(v))) return null;
    try {
      return calculateExposureSnr(input as never);
    } catch {
      return null;
    }
  }, [values]);
  const update = (field: keyof ExposureSnrValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const fields: Array<
    [keyof ExposureSnrValues, string, string, number, number?]
  > = [
    ["effectiveFocalLengthMm", "Effective focal length", "mm", 1],
    ["pixelSizeUm", "Camera pixel pitch", "µm", 0.1],
    ["binningFactor", "Binning", "×", 1, 4],
    [
      "sourceRateElectronsPerSecPerArcsec2",
      "Source signal rate",
      "e⁻/s/arcsec²",
      0,
    ],
    [
      "skyRateElectronsPerSecPerArcsec2",
      "Sky background rate",
      "e⁻/s/arcsec²",
      0,
    ],
    ["darkCurrentElectronsPerSecPerPixel", "Dark current", "e⁻/s/px", 0],
    ["readNoiseElectrons", "Read noise", "e⁻", 0],
    ["subExposureSeconds", "Sub-exposure", "s", 0.1],
    ["frameCount", "Frame count", "frames", 1],
  ];
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="exposure-snr" />
      <header className={styles.intro}>
        <p className="eyebrow">Exposure &amp; Signal-to-Noise</p>
        <h1>See what each exposure adds to the stack.</h1>
        <p className={styles.lede}>
          Combine the full imaging train with measured or estimated electron
          rates to compare signal, sky, dark current and read noise.
        </p>
      </header>
      <CalculatorExplainer
        slug="exposure-snr"
        guidance="The saved optical train supplies image scale. Source, sky, dark-current and read-noise rates must describe the actual target, site and camera operating mode."
      />
      <CalculatorLineDiagram kind="exposure-snr" />
      <EquipmentInheritanceNotice
        appliedFields={[
          "effective focal length",
          "camera pixel pitch",
          "binning",
        ]}
        equipmentLabel={equipmentLabel}
      />
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="snr-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="snr-inputs">Train, rates and stack</h2>
          </div>
          <div className={styles.inputGrid}>
            {fields.map(([field, label, unit, min, max]) => (
              <NumericInput
                key={field}
                id={`snr-${field}`}
                label={label}
                name={field}
                unit={unit}
                min={min}
                {...(max === undefined ? {} : { max })}
                step={
                  field === "frameCount" || field === "binningFactor"
                    ? 1
                    : "any"
                }
                value={values[field]}
                onValueChange={update(field)}
              />
            ))}
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="snr-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="snr-results">Stack estimate</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Stack SNR</dt>
                  <dd>{format(result.snr, 2)}</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Single-frame SNR</dt>
                  <dd>{format(result.singleFrameSnr, 2)}</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Total integration</dt>
                  <dd>{format(result.totalIntegrationSeconds / 3600, 2)} h</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Image scale</dt>
                  <dd>{format(result.imageScaleArcsecPerPixel, 3)}″ / px</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Source electrons</dt>
                  <dd>{format(result.sourceElectrons, 0)} e⁻</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Sky / read variance</dt>
                  <dd>
                    {Number.isFinite(result.skyToReadNoiseVarianceRatio)
                      ? format(result.skyToReadNoiseVarianceRatio, 1)
                      : "∞"}
                    ×
                  </dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equation</h3>
                <MathExpression label="Signal to noise ratio for a calibrated stack">
                  <mrow>
                    <mi>SNR</mi>
                    <mo>=</mo>
                    <mfrac>
                      <mrow>
                        <mi>N</mi>
                        <mo>⁢</mo>
                        <mi>S</mi>
                      </mrow>
                      <msqrt>
                        <mrow>
                          <mi>N</mi>
                          <mo>⁢</mo>
                          <mo>(</mo>
                          <mi>S</mi>
                          <mo>+</mo>
                          <mi>B</mi>
                          <mo>+</mo>
                          <mi>D</mi>
                          <mo>+</mo>
                          <msup>
                            <mi>R</mi>
                            <mn>2</mn>
                          </msup>
                          <mo>)</mo>
                        </mrow>
                      </msqrt>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <p>
                  S, B and D are electrons per sub-exposure in one binned pixel;
                  R is read noise and N is frame count.
                </p>
              </div>
              <p className={styles.note}>
                Use rates measured from calibrated linear data where possible.
                This ideal model excludes flat-field error, gradients, clipping,
                registration loss, correlated noise, rejection losses and target
                structure within a pixel.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter non-negative rates and positive train, exposure and
              whole-frame values.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
