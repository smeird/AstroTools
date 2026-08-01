"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { CalculatorLineDiagram } from "@/components/diagrams/calculator-line-diagram";
import { NumericInput } from "@/components/design-system/numeric-input";
import { SharedTelescopeNotice } from "@/components/design-system/shared-telescope-notice";
import { MathExpression } from "@/components/equations";
import {
  parseSharedTelescopeSelection,
  SHARED_TELESCOPE_SELECTION_KEY,
  type SharedTelescopeSelection,
} from "@/features/shared-equipment/telescope-selection";
import { calculateBackfocusSpacing } from "@/lib/calculations";

import {
  BACKFOCUS_SPACING_PERSISTENCE_KEY,
  parseBackfocusSpacing,
  serializeBackfocusSpacing,
  type BackfocusSpacingValues,
} from "../model/persistence";
import styles from "./backfocus-spacing-calculator.module.css";

const defaults: BackfocusSpacingValues = {
  nominalBackfocusMm: "55",
  cameraDepthMm: "17.5",
  filterWheelDepthMm: "20",
  guiderDepthMm: "0",
  otherAdaptersMm: "5",
  installedSpacerMm: "13",
  filterThicknessMm: "2",
  filterRefractiveIndex: "1.5",
};

const parse = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function BackfocusSpacingCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [sharedTelescope, setSharedTelescope] =
    useState<SharedTelescopeSelection | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      BACKFOCUS_SPACING_PERSISTENCE_KEY,
    );
    const restored = stored ? parseBackfocusSpacing(stored) : null;
    const sharedRaw = window.localStorage.getItem(
      SHARED_TELESCOPE_SELECTION_KEY,
    );
    startTransition(() => {
      if (restored) setValues(restored);
      setSharedTelescope(
        sharedRaw ? parseSharedTelescopeSelection(sharedRaw) : null,
      );
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded)
      window.localStorage.setItem(
        BACKFOCUS_SPACING_PERSISTENCE_KEY,
        serializeBackfocusSpacing(values),
      );
  }, [loaded, values]);

  const result = useMemo(() => {
    const parsed = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, parse(value)]),
    );
    if (
      Object.values(parsed).some((value) => value === null) ||
      (parsed.filterRefractiveIndex ?? 0) <= 1
    )
      return null;
    return calculateBackfocusSpacing(
      parsed as unknown as Parameters<typeof calculateBackfocusSpacing>[0],
    );
  }, [values]);

  const update = (field: keyof BackfocusSpacingValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const guidance = result
    ? result.status === "within-tolerance"
      ? "The installed train is within ±0.10 mm of this first-order target."
      : result.status === "short"
        ? `Add ${format(result.adjustmentMm)} mm of spacing.`
        : `Remove ${format(Math.abs(result.adjustmentMm))} mm of spacing.`
    : "";

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="backfocus-spacing" />
      <header className={styles.intro}>
        <p className="eyebrow">Back-focus Spacing</p>
        <h1>Build the imaging train to the right depth.</h1>
        <p className={styles.lede}>
          Add the optical thicknesses between the reference shoulder and sensor,
          then account for the first-order focus shift introduced by a filter.
        </p>
      </header>
      <CalculatorLineDiagram kind="backfocus-spacing" />
      <SharedTelescopeNotice selection={sharedTelescope} used={false} />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="backfocus-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Mechanical stack</p>
            <h2 id="backfocus-inputs">Spacing inputs</h2>
            <p>
              Measure each item along the optical axis from shoulder to
              shoulder.
            </p>
          </div>
          <div className={styles.inputGrid}>
            {(
              [
                ["nominalBackfocusMm", "Nominal back focus"],
                ["cameraDepthMm", "Camera sensor depth"],
                ["filterWheelDepthMm", "Filter wheel or drawer"],
                ["guiderDepthMm", "Off-axis guider"],
                ["otherAdaptersMm", "Other adapters"],
                ["installedSpacerMm", "Installed spacer stack"],
                ["filterThicknessMm", "Filter glass thickness"],
              ] as const
            ).map(([field, label]) => (
              <NumericInput
                key={field}
                id={`backfocus-${field}`}
                label={label}
                name={field}
                unit="mm"
                min={0}
                max={1000}
                step="any"
                value={values[field]}
                onValueChange={update(field)}
              />
            ))}
            <NumericInput
              id="backfocus-filter-index"
              label="Filter refractive index"
              name="filterRefractiveIndex"
              unit="n"
              min={1.01}
              max={3}
              step="any"
              value={values.filterRefractiveIndex}
              onValueChange={update("filterRefractiveIndex")}
              description="1.5 is a useful estimate when the glass specification is unknown."
            />
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="backfocus-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="backfocus-results">Required spacing</h2>
          </div>
          {result ? (
            <>
              <div className={styles.gauge} aria-hidden="true">
                <span>reference shoulder</span>
                <div
                  className={styles.train}
                  style={{
                    width: `${Math.min(100, Math.max(8, (result.installedTrainLengthMm / result.correctedTargetMm) * 100))}%`,
                  }}
                />
                <span>sensor</span>
              </div>
              <p className={styles.guidance} role="status">
                {guidance}
              </p>
              <dl className={styles.results}>
                <div className={styles.card}>
                  <dt>Corrected target</dt>
                  <dd>{format(result.correctedTargetMm)} mm</dd>
                </div>
                <div className={styles.card}>
                  <dt>Installed train</dt>
                  <dd>{format(result.installedTrainLengthMm)} mm</dd>
                </div>
                <div className={styles.card}>
                  <dt>Required spacer</dt>
                  <dd>{format(result.requiredSpacerMm)} mm</dd>
                </div>
                <div className={styles.card}>
                  <dt>Spacing error</dt>
                  <dd>
                    {result.spacingErrorMm > 0 ? "+" : ""}
                    {format(result.spacingErrorMm)} mm
                  </dd>
                </div>
                <div className={styles.card}>
                  <dt>Filter allowance</dt>
                  <dd>{format(result.filterFocusAllowanceMm)} mm</dd>
                </div>
              </dl>
              <div className={styles.equations}>
                <h3>Equations</h3>
                <MathExpression label="Filter focus allowance">
                  <mrow>
                    <mi>c</mi>
                    <mo>=</mo>
                    <mi>t</mi>
                    <mo>⁢</mo>
                    <mo>(</mo>
                    <mn>1</mn>
                    <mo>−</mo>
                    <mfrac>
                      <mn>1</mn>
                      <mi>n</mi>
                    </mfrac>
                    <mo>)</mo>
                  </mrow>
                </MathExpression>
                <MathExpression label="Required spacer length">
                  <mrow>
                    <msub>
                      <mi>L</mi>
                      <mi>spacer</mi>
                    </msub>
                    <mo>=</mo>
                    <mo>(</mo>
                    <msub>
                      <mi>B</mi>
                      <mi>nominal</mi>
                    </msub>
                    <mo>+</mo>
                    <mi>c</mi>
                    <mo>)</mo>
                    <mo>−</mo>
                    <msub>
                      <mi>L</mi>
                      <mi>fixed</mi>
                    </msub>
                  </mrow>
                </MathExpression>
              </div>
              <p className={styles.note}>
                Manufacturer back-focus values and tolerances take precedence.
                Filter shift is a first-order paraxial estimate; tilt, thread
                engagement, shoulder placement, and wavelength can change the
                practical setting. Negative required spacer means the fixed
                train is already too long.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter non-negative lengths and a refractive index greater than
              one.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
