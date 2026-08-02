"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { AdvancedCalculatorKind } from "@/features/advanced-planning/advanced-calculator-definitions";
import { AstroIcon } from "./astro-icon";
import {
  calculatorBySlug,
  calculatorGroups,
  calculatorRegistry,
} from "@/lib/calculator-registry";
import styles from "./calculator-navigation.module.css";

type CalculatorNavigationKey =
  | "calculations"
  | "equipment"
  | AdvancedCalculatorKind
  | "field-of-view"
  | "resolution-and-sampling"
  | "modifier-effects"
  | "sensor-tilt"
  | "backfocus-spacing"
  | "guiding-ratio"
  | "polar-alignment-drift"
  | "exposure-snr"
  | "mosaic-planning"
  | "dew-heater"
  | "storage-volume";

export function CalculatorNavigation({
  active,
}: {
  active: CalculatorNavigationKey;
}) {
  const reference = calculatorBySlug(active);
  useEffect(() => {
    if (!reference) return;
    try {
      const key = "astrotools.recent-calculators.v1";
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      localStorage.setItem(
        key,
        JSON.stringify(
          [
            reference.slug,
            ...current.filter((slug) => slug !== reference.slug),
          ].slice(0, 6),
        ),
      );
    } catch {}
  }, [reference]);
  return (
    <>
      <nav aria-label="Planning workspaces" className={styles.primary}>
        <Link
          aria-current={active === "equipment" ? "page" : undefined}
          href="/equipment"
        >
          My Equipment
        </Link>
        <Link
          aria-current={active === "calculations" ? "page" : undefined}
          href="/calculations"
        >
          All Calculations
        </Link>
        <Link href="/find">Find a Calculation</Link>
        <Link href="/compare">Compare Rigs</Link>
      </nav>
      <details className={styles.browser}>
        <summary>
          Browse all 23 calculators <span aria-hidden="true">⌄</span>
        </summary>
        <div className={styles.groups}>
          {calculatorGroups.map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {calculatorRegistry
                .filter((item) => item.group === group)
                .map((item) => (
                  <Link
                    aria-current={active === item.slug ? "page" : undefined}
                    href={`/calculators/${item.slug}`}
                    key={item.slug}
                  >
                    <AstroIcon kind={item.icon} size={17} />
                    {item.name}
                  </Link>
                ))}
            </section>
          ))}
        </div>
      </details>
      {reference && (
        <details className={styles.about}>
          <summary>
            <AstroIcon kind={reference.icon} size={18} /> About this
            calculation: inputs, formula and confidence
          </summary>
          <div className={styles.aboutGrid}>
            <div>
              <p className={styles.question}>{reference.question}</p>
              <p>{reference.summary}</p>
              <span className={styles.confidence}>{reference.confidence}</span>
            </div>
            <div>
              <h2>Formula</h2>
              <p className={styles.formula}>{reference.formula}</p>
              <p>{reference.formulaWords}</p>
            </div>
            <div>
              <h2>Where to find the inputs</h2>
              <ul>
                {reference.inputs.map((input, index) => (
                  <li key={input}>
                    <strong>{input}</strong>
                    <span>
                      {reference.inputSources[index] ??
                        reference.inputSources.at(-1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Related</h2>
              {reference.related.map((slug) => {
                const item = calculatorBySlug(slug);
                return item ? (
                  <Link href={`/calculators/${slug}`} key={slug}>
                    {item.name} →
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        </details>
      )}
    </>
  );
}
