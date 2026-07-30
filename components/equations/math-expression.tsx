import type { KeyboardEvent } from "react";

import styles from "./equations.module.css";
import type { MathExpressionProps } from "./types";

function handleHorizontalScroll(event: KeyboardEvent<HTMLDivElement>) {
  if (
    !["ArrowLeft", "ArrowRight"].includes(event.key) ||
    event.currentTarget.scrollWidth <= event.currentTarget.clientWidth
  ) {
    return;
  }

  const direction = event.key === "ArrowRight" ? 1 : -1;
  const step = Math.max(40, event.currentTarget.clientWidth * 0.2);
  event.currentTarget.scrollLeft += direction * step;
  event.preventDefault();
}

export function MathExpression({ label, children }: MathExpressionProps) {
  return (
    <figure className={styles.expression}>
      <figcaption className={styles.expressionLabel}>{label}</figcaption>
      <div
        aria-label={`${label}; scroll horizontally if needed`}
        className={styles.expressionViewport}
        onKeyDown={handleHorizontalScroll}
        role="group"
        tabIndex={0}
      >
        <math className={styles.math} display="block">
          {children}
        </math>
      </div>
    </figure>
  );
}
