import Link from "next/link";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";

const questions = [
  "How much sky will my equipment capture?",
  "Will the target fit within the frame?",
  "What image scale will the combination produce?",
  "How does the sampling compare with my seeing?",
] as const;

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />

      <main id="main-content" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Field of View Lab</p>
            <h1 id="hero-title">Plan the frame before the sky gets dark.</h1>
            <p className="lede">
              Explore how a telescope, optical modifier, and camera shape the
              sky you capture—with exact geometry and qualified sampling
              guidance.
            </p>
            <Link className="primary-action" href="/calculators/field-of-view">
              Open the field lab
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="secondary-action" href="/equipment">
              Save my equipment setup
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="secondary-action"
              href="/calculators/resolution-and-sampling"
            >
              Explore resolution and sampling
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="secondary-action"
              href="/calculators/guiding-ratio"
            >
              Check guiding ratio
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="secondary-action"
              href="/calculators/polar-alignment-drift"
            >
              Diagnose polar-alignment drift
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="secondary-action" href="/calculators/exposure-snr">
              Estimate exposure and SNR
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="secondary-action"
              href="/calculators/mosaic-planning"
            >
              Plan a mosaic<span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="field-study" aria-hidden="true">
            <div className="orbit orbit-wide" />
            <div className="orbit orbit-tight" />
            <div className="sensor-frame">
              <span className="sensor-crosshair" />
              <span className="target-core" />
            </div>
            <span className="coordinate coordinate-one">00h 42m</span>
            <span className="coordinate coordinate-two">+41° 16′</span>
          </div>
        </section>

        <section className="questions" aria-labelledby="questions-title">
          <div>
            <p className="eyebrow">Built for a decision</p>
            <h2 id="questions-title">
              Four questions. One reproducible setup.
            </h2>
          </div>
          <ol>
            {questions.map((question, index) => (
              <li key={question}>
                <span aria-hidden="true">0{index + 1}</span>
                {question}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
