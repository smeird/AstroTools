"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { NumericInput } from "@/components/design-system/numeric-input";
import { SharedTelescopeNotice } from "@/components/design-system/shared-telescope-notice";
import {
  parseSharedTelescopeSelection,
  SHARED_TELESCOPE_SELECTION_KEY,
  type SharedTelescopeSelection,
} from "@/features/shared-equipment/telescope-selection";
import { calculateSensorTilt } from "@/lib/calculations";

import {
  parseSensorTilt,
  SENSOR_TILT_PERSISTENCE_KEY,
  serializeSensorTilt,
  type SensorTiltValues,
} from "../model/persistence";
import styles from "./sensor-tilt-calculator.module.css";

const defaults: SensorTiltValues = {
  sensorWidthMm: "36",
  sensorHeightMm: "24",
  horizontalFocusDifferenceUm: "20",
  verticalFocusDifferenceUm: "10",
  adjusterSpacingMm: "50",
};

const finite = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const format = (value: number, digits = 3) =>
  value.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export function SensorTiltCalculator() {
  const [values, setValues] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [sharedTelescope, setSharedTelescope] =
    useState<SharedTelescopeSelection | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SENSOR_TILT_PERSISTENCE_KEY);
    const restored = stored ? parseSensorTilt(stored) : null;
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
    if (loaded) {
      window.localStorage.setItem(
        SENSOR_TILT_PERSISTENCE_KEY,
        serializeSensorTilt(values),
      );
    }
  }, [loaded, values]);

  const result = useMemo(() => {
    const input = {
      sensorWidthMm: finite(values.sensorWidthMm),
      sensorHeightMm: finite(values.sensorHeightMm),
      horizontalFocusDifferenceUm: finite(values.horizontalFocusDifferenceUm),
      verticalFocusDifferenceUm: finite(values.verticalFocusDifferenceUm),
      adjusterSpacingMm: finite(values.adjusterSpacingMm),
    };
    if (
      Object.values(input).some((value) => value === null) ||
      (input.sensorWidthMm ?? 0) <= 0 ||
      (input.sensorHeightMm ?? 0) <= 0 ||
      (input.adjusterSpacingMm ?? 0) <= 0
    )
      return null;
    return calculateSensorTilt(
      input as Parameters<typeof calculateSensorTilt>[0],
    );
  }, [values]);

  const update = (field: keyof SensorTiltValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const direction = result
    ? `${result.horizontalTiltDeg < 0 ? "left" : "right"} side and ${result.verticalTiltDeg < 0 ? "top" : "bottom"} side are farther from the reference focus.`
    : "";

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← All calculators
      </Link>
      <CalculatorNavigation active="sensor-tilt" />
      <header className={styles.intro}>
        <p className="eyebrow">Sensor Tilt</p>
        <h1>Turn focus differences into a correction.</h1>
        <p className={styles.lede}>
          Enter focus offsets measured across the sensor. The plane model shows
          the tilt magnitude and the equivalent adjustment at your tilt plate.
        </p>
      </header>
      <SharedTelescopeNotice selection={sharedTelescope} used={false} />

      <div className={styles.workspace}>
        <section className={styles.panel} aria-labelledby="tilt-inputs-title">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Measurements</p>
            <h2 id="tilt-inputs-title">Sensor and focus plane</h2>
            <p>
              Positive means the right or bottom edge focuses farther away;
              negative reverses that direction.
            </p>
          </div>
          <div className={styles.inputGrid}>
            <NumericInput
              id="tilt-sensor-width"
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
              id="tilt-sensor-height"
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
              id="tilt-horizontal-focus"
              label="Left-to-right focus difference"
              name="horizontalFocusDifferenceUm"
              unit="µm"
              min={-10000}
              max={10000}
              step="any"
              value={values.horizontalFocusDifferenceUm}
              onValueChange={update("horizontalFocusDifferenceUm")}
            />
            <NumericInput
              id="tilt-vertical-focus"
              label="Top-to-bottom focus difference"
              name="verticalFocusDifferenceUm"
              unit="µm"
              min={-10000}
              max={10000}
              step="any"
              value={values.verticalFocusDifferenceUm}
              onValueChange={update("verticalFocusDifferenceUm")}
            />
            <NumericInput
              id="tilt-adjuster-spacing"
              label="Centre-to-adjuster distance"
              name="adjusterSpacingMm"
              unit="mm"
              min={0.1}
              max={1000}
              step="any"
              value={values.adjusterSpacingMm}
              onValueChange={update("adjusterSpacingMm")}
              description="Radial distance from the optical axis to the adjustment point."
            />
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="tilt-results-title">
          <div className={styles.panelHeader}>
            <p className="eyebrow">Calculated now</p>
            <h2 id="tilt-results-title">Plane tilt and correction</h2>
          </div>
          {result ? (
            <>
              <div className={styles.liveStudy} aria-hidden="true">
                <div
                  className={styles.sensorPlane}
                  style={{
                    transform: `rotateY(${Math.max(-12, Math.min(12, result.horizontalTiltDeg * 80))}deg) rotateX(${Math.max(-12, Math.min(12, -result.verticalTiltDeg * 80))}deg)`,
                  }}
                >
                  <span>sensor plane</span>
                </div>
                <div className={styles.referencePlane}>reference focus</div>
              </div>
              <p className={styles.nonVisualSummary}>
                Combined tilt is {format(result.combinedTiltArcmin, 2)} arcmin;{" "}
                {direction}
              </p>
              <div className={styles.results}>
                <dl className={styles.card}>
                  <dt>Combined plane tilt</dt>
                  <dd>
                    {format(result.combinedTiltDeg, 4)}°
                    <span>{format(result.combinedTiltArcmin, 2)} arcmin</span>
                  </dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Adjuster correction</dt>
                  <dd>
                    {format(result.correctionAtAdjusterUm, 1)} µm
                    <span>
                      at {format(Number(values.adjusterSpacingMm), 1)} mm
                    </span>
                  </dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Horizontal tilt</dt>
                  <dd>{format(result.horizontalTiltDeg, 4)}°</dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Vertical tilt</dt>
                  <dd>{format(result.verticalTiltDeg, 4)}°</dd>
                </dl>
                <dl className={styles.card}>
                  <dt>Corner-to-corner focus delta</dt>
                  <dd>
                    {format(result.cornerToCornerFocusDifferenceUm, 1)} µm
                  </dd>
                </dl>
              </div>
              <div className={styles.equation}>
                <h3>Model</h3>
                <p>
                  θx = atan(Δx / width), θy = atan(Δy / height), and combined
                  tilt = atan(√(tan²θx + tan²θy)).
                </p>
              </div>
              <p className={styles.note}>
                This is a geometric plane estimate. Focus measurements can also
                include field curvature, optical aberration, sag, seeing, and
                measurement noise. Confirm corrections with repeated exposures.
              </p>
            </>
          ) : (
            <p className={styles.note}>
              Enter positive sensor dimensions and adjuster spacing, with finite
              focus differences, to calculate the tilt.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
