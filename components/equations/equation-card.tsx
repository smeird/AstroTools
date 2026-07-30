import { Fragment } from "react";

import styles from "./equations.module.css";
import type { EquationCardProps } from "./types";

export function EquationCard({
  title,
  inWords,
  variables,
  finalResult,
  interpretation,
  children,
}: EquationCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>

      <div className={styles.expressions}>{children}</div>

      <section className={styles.explanation}>
        <h4 className={styles.sectionTitle}>In words</h4>
        <div className={styles.prose}>{inWords}</div>
      </section>

      <section className={styles.explanation}>
        <h4 className={styles.sectionTitle}>Variables and units</h4>
        <dl className={styles.variables}>
          {variables.map((variable, index) => (
            <Fragment key={index}>
              <dt className={styles.symbol}>{variable.symbol}</dt>
              <dd className={styles.definition}>
                <span>{variable.meaning}</span>
                <span className={styles.unit}>Unit: {variable.unit}</span>
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <section className={styles.explanation}>
        <h4 className={styles.sectionTitle}>Final result</h4>
        <div className={styles.finalResult}>{finalResult}</div>
      </section>

      <section className={styles.explanation}>
        <h4 className={styles.sectionTitle}>Interpretation</h4>
        <div className={styles.prose}>{interpretation}</div>
      </section>
    </article>
  );
}
