"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { NumericInput } from "@/components/design-system/numeric-input";
import { CalculatorLineDiagram } from "@/components/diagrams/calculator-line-diagram";
import { MathExpression } from "@/components/equations";
import {
  parseSharedImagingTrain,
  SHARED_IMAGING_TRAIN_KEY,
  type SharedImagingTrain,
} from "@/features/shared-equipment/telescope-selection";

import {
  advancedCalculatorDefinitions,
  type AdvancedCalculatorKind,
  type AdvancedField,
} from "../advanced-calculator-definitions";
import styles from "./advanced-calculator.module.css";

function sharedValue(
  field: AdvancedField,
  train: SharedImagingTrain,
): string | null {
  const binning = Number(train.binningFactor);
  switch (field.shared) {
    case "focalLengthMm":
      return train.effectiveFocalLengthMm;
    case "pixelSizeUm":
      return String(Number(train.pixelSizeUm) * binning);
    case "widthPx":
      return train.resolutionWidthPx
        ? String(
            Math.max(1, Math.floor(Number(train.resolutionWidthPx) / binning)),
          )
        : null;
    case "heightPx":
      return train.resolutionHeightPx
        ? String(
            Math.max(1, Math.floor(Number(train.resolutionHeightPx) / binning)),
          )
        : null;
    case "focalRatio":
      return String(
        Number(train.effectiveFocalLengthMm) / Number(train.apertureMm),
      );
    default:
      return null;
  }
}

function formulaSymbols(kind: AdvancedCalculatorKind): string {
  const formulas: Record<AdvancedCalculatorKind, string> = {
    "optimal-sub-exposure": "tₘᵢₙ = kR² ÷ (Sₛₖᵧ + D)",
    "integration-planner": "SNR₂ ÷ SNR₁ = √(T₂ ÷ T₁)",
    "filter-exposure-planner": "Tᵢ = T × (wᵢ ÷ ηᵢ) ÷ Σ(w ÷ η)",
    "star-saturation": "tₛₐₜ = W(1 − h) ÷ F★",
    "guiding-exposure": "SNR = Ft ÷ √((F + B)t + R²)",
    "plate-solving-scale": "s = 206.265p ÷ f",
    "imaging-window": "cos H = (sin a − sin φ sin δ) ÷ (cos φ cos δ)",
    "atmospheric-extinction": "Δm = kX ; transmission = 10⁻⁰·⁴Δᵐ",
    "calibration-frames": "σₘₐₛₜₑᵣ = σ₁ ÷ √N",
    "drizzle-planner": "Nₚᵢₓ,out = Nₚᵢₓ,in × d²",
    "field-rotation": "Δsₑdge = rθ",
    "autofocus-planning": "CFZ ≈ 2.2λN²",
  };
  return formulas[kind];
}

function formatValue(value: number | boolean | string, digits = 2) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function AdvancedCalculator({ kind }: { kind: AdvancedCalculatorKind }) {
  const definition = advancedCalculatorDefinitions[kind];
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        definition.fields.map((field) => [field.key, field.defaultValue]),
      ),
    [definition],
  );
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [rigLabel, setRigLabel] = useState<string | null>(null);
  const persistenceKey = `astrotools.${kind}.settings.v1`;

  useEffect(() => {
    let restored = defaults;
    let previousTrain = "";
    try {
      const stored = JSON.parse(localStorage.getItem(persistenceKey) ?? "") as {
        version?: number;
        values?: Record<string, string>;
        train?: string;
      };
      if (stored.version === 1 && stored.values)
        restored = { ...defaults, ...stored.values };
      previousTrain = stored.train ?? "";
    } catch {}

    const rawTrain = localStorage.getItem(SHARED_IMAGING_TRAIN_KEY) ?? "";
    const train = rawTrain ? parseSharedImagingTrain(rawTrain) : null;
    let restoredRigLabel: string | null = null;
    if (train) {
      restoredRigLabel = train.rigName || train.telescopeLabel;
      if (rawTrain !== previousTrain) {
        restored = Object.fromEntries(
          definition.fields.map((field) => [
            field.key,
            sharedValue(field, train) ??
              restored[field.key] ??
              field.defaultValue,
          ]),
        );
      }
    }
    startTransition(() => {
      setValues(restored);
      setRigLabel(restoredRigLabel);
      setLoaded(true);
    });
  }, [defaults, definition, persistenceKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      persistenceKey,
      JSON.stringify({
        version: 1,
        values,
        train: localStorage.getItem(SHARED_IMAGING_TRAIN_KEY) ?? "",
      }),
    );
  }, [loaded, persistenceKey, values]);

  const results = useMemo(() => {
    try {
      return definition.calculate(
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, Number(value)]),
        ),
      );
    } catch {
      return null;
    }
  }, [definition, values]);

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active={kind} />
      <header className={styles.intro}>
        <p className="eyebrow">{definition.eyebrow}</p>
        <h1>{definition.title}</h1>
        <p className={styles.lede}>{definition.lede}</p>
      </header>
      <CalculatorLineDiagram kind={kind} />
      {rigLabel ? (
        <p className={styles.rigNotice} role="note">
          Shared rig applied: <strong>{rigLabel}</strong>. Rig-derived fields
          update when the saved imaging train changes; specialist measurements
          remain local to this calculator.
        </p>
      ) : null}
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby={`${kind}-inputs`}>
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id={`${kind}-inputs`}>{definition.inputTitle}</h2>
          </div>
          <div className={styles.inputGrid}>
            {definition.fields.map((field) => (
              <NumericInput
                key={field.key}
                id={`${kind}-${field.key}`}
                label={field.label}
                name={field.key}
                unit={field.unit}
                {...(field.min === undefined ? {} : { min: field.min })}
                {...(field.max === undefined ? {} : { max: field.max })}
                step="any"
                value={values[field.key] ?? ""}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, [field.key]: value }))
                }
              />
            ))}
          </div>
        </section>
        <section className={styles.panel} aria-labelledby={`${kind}-results`}>
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id={`${kind}-results`}>{definition.resultTitle}</h2>
          </div>
          {results ? (
            <dl className={styles.results}>
              {results.map((result, index) => (
                <div
                  className={styles.resultCard}
                  key={`${result.label}-${index}`}
                >
                  <dt>{result.label}</dt>
                  <dd>
                    {formatValue(result.value, result.digits)}
                    {result.unit ? ` ${result.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.invalid}>
              Enter values within the labelled physical limits.
            </p>
          )}
          <div className={styles.formula}>
            <h3>Governing equation</h3>
            <MathExpression label={definition.formulaLabel}>
              <mrow>
                <mtext>{formulaSymbols(kind)}</mtext>
              </mrow>
            </MathExpression>
            <p>
              <strong>In words:</strong> {definition.formulaWords}
            </p>
          </div>
          <p className={styles.note}>{definition.note}</p>
        </section>
      </div>
    </main>
  );
}
