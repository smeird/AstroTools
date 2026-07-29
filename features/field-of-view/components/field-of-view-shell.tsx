import type { ReactNode } from "react";
import Link from "next/link";

import styles from "./field-of-view-shell.module.css";

interface FieldOfViewShellProps {
  controls: ReactNode;
  summary: ReactNode;
  visualisation: ReactNode;
  results: ReactNode;
}

export function FieldOfViewShell({
  controls,
  summary,
  visualisation,
  results,
}: FieldOfViewShellProps) {
  return (
    <>
      <section className={styles.intro} aria-labelledby="lab-title">
        <div>
          <Link className={styles.breadcrumb} href="/" prefetch={false}>
            ← All calculators
          </Link>
          <p className="eyebrow">Field of View Lab</p>
          <h1 className={styles.title} id="lab-title">
            Frame the sky with confidence.
          </h1>
          <p className={styles.lede}>
            Explore exact field geometry and see how image scale compares with
            your local seeing. Results update here in the browser.
          </p>
        </div>
        <p className={styles.introNote}>
          This interface preview uses a local reference sensor. Searchable
          equipment catalogues and target framing will arrive as dedicated,
          verified capabilities.
        </p>
      </section>

      <div className={styles.workspace}>
        <div className={styles.controls}>{controls}</div>
        <div className={styles.summary}>{summary}</div>
        <div className={styles.visualisation}>{visualisation}</div>
        <div className={styles.results}>{results}</div>
      </div>
    </>
  );
}

export function FieldOfViewPageFrame({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
