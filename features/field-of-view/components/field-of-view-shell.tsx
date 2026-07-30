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
          Catalogue presets are sourced from MySQL and copied into local
          calculator state. Ordinary control changes never wait for the network;
          target illustrations are scaled from catalogue angles but remain
          visual guides rather than calibrated sky-survey imagery.
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
