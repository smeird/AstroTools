import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Field of View Lab",
};

export default function FieldOfViewPage() {
  return (
    <main className="lab-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Astrotools home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Astrotools</span>
        </Link>
        <span className="release-tag">Field Lab</span>
      </header>

      <section className="lab-placeholder" aria-labelledby="lab-title">
        <p className="eyebrow">Release 01</p>
        <h1 id="lab-title">Field of View &amp; Image Sampling</h1>
        <p>
          The production foundation is ready. The calculation engine arrives in
          Work Package 1.
        </p>
        <Link className="text-link" href="/">
          ← Return home
        </Link>
      </section>
    </main>
  );
}
