import { calculatorBySlug } from "@/lib/calculator-registry";

import styles from "./calculator-explainer.module.css";

export function CalculatorExplainer({
  guidance,
  slug,
}: {
  guidance?: string;
  slug: string;
}) {
  const reference = calculatorBySlug(slug);
  if (!reference) return null;

  return (
    <section
      className={styles.explainer}
      aria-labelledby={`${slug}-explanation-title`}
    >
      <div>
        <p className="eyebrow">Purpose and method</p>
        <h2 id={`${slug}-explanation-title`}>What this calculator does</h2>
      </div>
      <div className={styles.copy}>
        <p>
          <strong>{reference.question}</strong> {reference.summary}
        </p>
        <p>
          <strong>In words:</strong> {reference.formulaWords}
        </p>
        {guidance ? <p>{guidance}</p> : null}
      </div>
    </section>
  );
}
