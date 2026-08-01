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
import { calculateStorageVolume } from "@/lib/calculations";
import styles from "./calculator.module.css";
const key = "astrotools.storage-volume.settings.v1",
  appliedKey = "astrotools.storage-volume.train-applied.v1",
  defaults = {
    resolutionWidthPx: "6248",
    resolutionHeightPx: "4176",
    bitDepth: "16",
    channelCount: "1",
    exposureSeconds: "120",
    sessionHours: "4",
    calibrationFrames: "60",
    fileOverheadPercent: "5",
  };
type Values = typeof defaults;
const f = (n: number, d = 2) =>
  n.toLocaleString("en-GB", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function StorageVolumeCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let restored = defaults;
    try {
      const p = JSON.parse(localStorage.getItem(key) ?? "") as {
        version?: number;
        values?: Values;
      };
      if (p.version === 1 && p.values) restored = p.values;
    } catch {}
    const raw = localStorage.getItem(SHARED_IMAGING_TRAIN_KEY),
      train = raw ? parseSharedImagingTrain(raw) : null,
      applied = applySharedImagingTrainWhenChanged(
        restored,
        train,
        localStorage.getItem(appliedKey),
        (c, t) => ({
          ...c,
          ...(t.resolutionWidthPx && t.resolutionHeightPx
            ? {
                resolutionWidthPx: t.resolutionWidthPx,
                resolutionHeightPx: t.resolutionHeightPx,
              }
            : {}),
        }),
      );
    startTransition(() => {
      setValues(applied.values);
      setLoaded(true);
    });
    if (applied.changed && applied.appliedSelection)
      localStorage.setItem(appliedKey, applied.appliedSelection);
  }, []);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(key, JSON.stringify({ version: 1, values }));
  }, [loaded, values]);
  const result = useMemo(() => {
    try {
      return calculateStorageVolume(
        Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, Number(v)]),
        ) as never,
      );
    } catch {
      return null;
    }
  }, [values]);
  const u = (field: keyof Values) => (value: string) =>
    setValues((c) => ({ ...c, [field]: value }));
  const fields: Array<[keyof Values, string, string, number]> = [
    ["resolutionWidthPx", "Resolution width", "px", 1],
    ["resolutionHeightPx", "Resolution height", "px", 1],
    ["bitDepth", "Bit depth", "bit", 1],
    ["channelCount", "Stored channels", "channels", 1],
    ["exposureSeconds", "Exposure length", "s", 0.01],
    ["sessionHours", "Session duration", "h", 0.01],
    ["calibrationFrames", "Calibration frames", "frames", 0],
    ["fileOverheadPercent", "File overhead", "%", 0],
  ];
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="storage-volume" />
      <header className={styles.intro}>
        <p className="eyebrow">Storage &amp; Data Volume</p>
        <h1>Know how much data the night will produce.</h1>
        <p className={styles.lede}>
          Turn camera resolution, capture format, cadence and calibration plan
          into frame size, session volume and sustained write rate.
        </p>
      </header>
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="storage-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="storage-inputs">Capture plan</h2>
          </div>
          <div className={styles.inputGrid}>
            {fields.map(([field, label, unit, min]) => (
              <NumericInput
                key={field}
                id={`storage-${field}`}
                label={label}
                name={field}
                unit={unit}
                min={min}
                step="any"
                value={values[field]}
                onValueChange={u(field)}
              />
            ))}
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="storage-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="storage-results">Data budget</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Per frame</dt>
                  <dd>{f(result.bytesPerFrame / 2 ** 20)} MiB</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Light frames</dt>
                  <dd>{result.lightFrameCount}</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Total frames</dt>
                  <dd>{result.totalFrameCount}</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Total storage</dt>
                  <dd>{f(result.totalDataGiB)} GiB</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Light data</dt>
                  <dd>{f(result.lightDataBytes / 2 ** 30)} GiB</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Average write rate</dt>
                  <dd>{f(result.sustainedWriteMiBPerSecond, 3)} MiB/s</dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equation</h3>
                <MathExpression label="Frame byte size">
                  <mrow>
                    <msub>
                      <mi>V</mi>
                      <mi>frame</mi>
                    </msub>
                    <mo>=</mo>
                    <mi>W</mi>
                    <mo>⁢</mo>
                    <mi>H</mi>
                    <mo>⁢</mo>
                    <mfrac>
                      <mi>b</mi>
                      <mn>8</mn>
                    </mfrac>
                    <mo>⁢</mo>
                    <mi>C</mi>
                    <mo>⁢</mo>
                    <mo>(</mo>
                    <mn>1</mn>
                    <mo>+</mo>
                    <mi>o</mi>
                    <mo>)</mo>
                  </mrow>
                </MathExpression>
              </div>
              <p className={styles.note}>
                Actual FITS/XISF compression, metadata, previews, temporary
                files, rejected subs, live stacking, drizzle and backups can
                change the requirement. Keep working space and a separate backup
                allowance beyond this capture estimate.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter positive resolution, format, exposure and session values.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
