import type { ReactNode } from "react";
import Link from "next/link";
import type { FieldOfViewShareNotice } from "../schemas/shareable-state";
import { CalculatorExplainer } from "@/components/design-system/calculator-explainer";
import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { CalculatorLineDiagram } from "@/components/diagrams/calculator-line-diagram";

import styles from "./field-of-view-shell.module.css";

interface FieldOfViewShellProps {
  controls: ReactNode;
  equations: ReactNode;
  summary: ReactNode;
  visualisation: ReactNode;
  results: ReactNode;
  notice?: FieldOfViewShareNotice | null | undefined;
}

export function FieldOfViewShell({
  controls,
  equations,
  summary,
  visualisation,
  results,
  notice,
}: FieldOfViewShellProps) {
  return (
    <>
      <section className={styles.intro} aria-labelledby="lab-title">
        <div>
          <Link className={styles.breadcrumb} href="/" prefetch={false}>
            ← All calculators
          </Link>
          <CalculatorNavigation active="field-of-view" />
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

      <CalculatorExplainer
        slug="field-of-view"
        guidance="Focal length controls the angular field; aperture affects focal ratio and sampling context but does not independently change field of view. Display zoom changes only the drawing."
      />
      <CalculatorLineDiagram kind="field-of-view" />

      {notice ? (
        <aside
          aria-labelledby="shared-link-notice-title"
          className={styles.shareNotice}
          role="note"
        >
          <h2 id="shared-link-notice-title">Shared-link adjustment</h2>
          <p>
            {notice.kind === "unsupported-version"
              ? "This shared link uses a missing, invalid, or unsupported version. The default configuration was restored safely."
              : `Some settings from this shared link could not be used. Safe defaults were restored for: ${notice.settings.join(", ")}. Other valid settings were applied.`}
          </p>
        </aside>
      ) : null}

      <div className={styles.workspace}>
        <div className={styles.controls}>{controls}</div>
        <div className={styles.workspaceMain}>
          <div className={styles.summary}>{summary}</div>
          <div className={styles.visualisation}>{visualisation}</div>
          <div className={styles.results}>{results}</div>
          {equations ? (
            <div className={styles.equations}>{equations}</div>
          ) : null}
        </div>
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
