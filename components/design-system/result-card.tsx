import type { ReactNode } from "react";

import styles from "./result-card.module.css";

export interface ResultCardProps {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  interpretation?: ReactNode;
  statusText?: string;
}

export function ResultCard({
  label,
  value,
  secondary,
  interpretation,
  statusText,
}: ResultCardProps) {
  return (
    <div className={styles.card}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>
        {value}
        {secondary ? (
          <span className={styles.secondary}>{secondary}</span>
        ) : null}
        {statusText ? (
          <span className={styles.status}>{statusText}</span>
        ) : null}
        {interpretation ? (
          <span className={styles.interpretation}>{interpretation}</span>
        ) : null}
      </dd>
    </div>
  );
}

export function ResultGrid({ children }: { children: ReactNode }) {
  return <dl className={styles.grid}>{children}</dl>;
}
