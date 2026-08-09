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
import { calculateDewHeater } from "@/lib/calculations";
import styles from "./calculator.module.css";
const key = "astrotools.dew-heater.settings.v1",
  appliedKey = "astrotools.dew-heater.train-applied.v1",
  defaults = {
    ambientTemperatureC: "10",
    relativeHumidityPercent: "90",
    opticDiameterMm: "200",
    heaterBandWidthMm: "40",
    safetyMarginC: "4",
    heatTransferCoefficientWPerM2K: "25",
    efficiencyPercent: "70",
    supplyVoltage: "12",
  };
type Values = typeof defaults;
const f = (n: number, d = 2) =>
  n.toLocaleString("en-GB", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export function DewHeaterCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [equipmentLabel, setEquipmentLabel] = useState<string | null>(null);
  const trainMarker = useRef<string | null>(null);
  useEffect(() => {
    let restored = defaults;
    try {
      const p = JSON.parse(localStorage.getItem(key) ?? "") as {
        version?: number;
        values?: Values;
      };
      if (p.version === 1 && p.values) restored = p.values;
    } catch {}
    const trainRaw = localStorage.getItem(SHARED_IMAGING_TRAIN_KEY);
    const train = trainRaw ? parseSharedImagingTrain(trainRaw) : null;
    const applied = applySharedImagingTrainWhenChanged(
      restored,
      train,
      localStorage.getItem(appliedKey),
      (current, selection) => ({
        ...current,
        opticDiameterMm: selection.apertureMm,
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
      localStorage.setItem(key, JSON.stringify({ version: 1, values }));
    if (loaded && trainMarker.current)
      localStorage.setItem(appliedKey, trainMarker.current);
  }, [loaded, values]);
  const result = useMemo(() => {
    try {
      return calculateDewHeater(
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
  const fields: Array<[keyof Values, string, string, number, number?]> = [
    ["ambientTemperatureC", "Ambient temperature", "°C", -80, 80],
    ["relativeHumidityPercent", "Relative humidity", "%", 1, 100],
    ["opticDiameterMm", "Optic diameter", "mm", 1],
    ["heaterBandWidthMm", "Heater band width", "mm", 1],
    ["safetyMarginC", "Margin above dew point", "°C", 0.1],
    ["heatTransferCoefficientWPerM2K", "Heat-loss coefficient", "W/m²K", 0.1],
    ["efficiencyPercent", "Heater efficiency", "%", 1, 100],
    ["supplyVoltage", "Supply voltage", "V", 1],
  ];
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="dew-heater" />
      <header className={styles.intro}>
        <p className="eyebrow">Dew Point &amp; Heater Power</p>
        <h1>Stay above the dew point without overheating.</h1>
        <p className={styles.lede}>
          Estimate dew point, safety margin and first-order heater demand from
          local conditions and heater-band geometry.
        </p>
      </header>
      <CalculatorExplainer
        slug="dew-heater"
        guidance="The saved aperture supplies the optic diameter. Ambient conditions, heater-band width, efficiency and heat-loss assumptions must match the actual night and installation."
      />
      <CalculatorLineDiagram kind="dew-heater" />
      <EquipmentInheritanceNotice
        appliedFields={["optic diameter from telescope aperture"]}
        equipmentLabel={equipmentLabel}
      />
      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="dew-inputs">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Inputs</p>
            <h2 id="dew-inputs">Conditions and heater</h2>
          </div>
          <div className={styles.inputGrid}>
            {fields.map(([field, label, unit, min, max]) => (
              <NumericInput
                key={field}
                id={`dew-${field}`}
                label={label}
                name={field}
                unit={unit}
                min={min}
                {...(max === undefined ? {} : { max })}
                step="any"
                value={values[field]}
                onValueChange={u(field)}
              />
            ))}
          </div>
        </section>
        <section className={styles.panel} aria-labelledby="dew-results">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="dew-results">Dew control estimate</h2>
          </div>
          {result ? (
            <>
              <dl className={styles.results}>
                <div className={styles.resultCard}>
                  <dt>Dew point</dt>
                  <dd>{f(result.dewPointC)} °C</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Ambient margin</dt>
                  <dd>{f(result.ambientDewMarginC)} °C</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Target optic temperature</dt>
                  <dd>{f(result.targetTemperatureC)} °C</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Estimated heater power</dt>
                  <dd>{f(result.estimatedPowerW)} W</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Estimated current</dt>
                  <dd>{f(result.estimatedCurrentA)} A</dd>
                </div>
                <div className={styles.resultCard}>
                  <dt>Current risk</dt>
                  <dd>{result.risk.replaceAll("-", " ")}</dd>
                </div>
              </dl>
              <div className={styles.formula}>
                <h3>Equations</h3>
                <MathExpression label="Magnus dew point">
                  <mrow>
                    <msub>
                      <mi>T</mi>
                      <mi>d</mi>
                    </msub>
                    <mo>=</mo>
                    <mfrac>
                      <mrow>
                        <mi>b</mi>
                        <mo>⁢</mo>
                        <mi>γ</mi>
                      </mrow>
                      <mrow>
                        <mi>a</mi>
                        <mo>−</mo>
                        <mi>γ</mi>
                      </mrow>
                    </mfrac>
                  </mrow>
                </MathExpression>
                <MathExpression label="First order heater power">
                  <mrow>
                    <mi>P</mi>
                    <mo>≈</mo>
                    <mfrac>
                      <mrow>
                        <mi>h</mi>
                        <mo>⁢</mo>
                        <mi>A</mi>
                        <mo>⁢</mo>
                        <mi>ΔT</mi>
                      </mrow>
                      <mi>η</mi>
                    </mfrac>
                  </mrow>
                </MathExpression>
              </div>
              <p className={styles.note}>
                Power is a planning estimate. Wind, radiative cooling to the
                sky, insulation, cell mass, controller placement and sensor
                contact can materially change demand. Use closed-loop control
                and avoid warming optics more than necessary.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter valid conditions and positive heater values.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
