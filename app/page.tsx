import Link from "next/link";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { AstroIcon } from "@/components/design-system/astro-icon";
import { HomeInstrumentPanel } from "@/features/home/components/home-instrument-panel";
import {
  calculatorGroups,
  calculatorRegistry,
} from "@/lib/calculator-registry";

const questions = [
  ["What is my pixel scale?", "pixel scale"],
  ["How long should my sub-exposures be?", "how long should my subs be"],
  ["Will this target fit my camera?", "will my target fit"],
  ["How much storage will I need?", "storage"],
] as const;

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Astrophotography Planning Suite" />
      <main id="main-content" tabIndex={-1}>
        <HomeInstrumentPanel />
        <section className="home-command" aria-labelledby="home-search-title">
          <div>
            <p className="eyebrow">Direct calculation access</p>
            <h2 id="home-search-title">What do you need to work out?</h2>
            <p>
              Search by a result, unit, formula, equipment value or
              plain-English question.
            </p>
          </div>
          <div>
            <form action="/find" role="search">
              <label htmlFor="home-calculation-search">
                Search all {calculatorRegistry.length} calculators
              </label>
              <div>
                <input
                  id="home-calculation-search"
                  name="q"
                  placeholder="Pixel scale, SNR, dew point, field rotation…"
                />
                <button className="primary-action" type="submit">
                  Find →
                </button>
              </div>
            </form>
            <nav aria-label="Common calculation questions">
              {questions.map(([label, query]) => (
                <Link href={`/find?q=${encodeURIComponent(query)}`} key={query}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </section>
        <section className="home-reference" aria-labelledby="reference-title">
          <div className="home-reference-heading">
            <div>
              <p className="eyebrow">Reference directory</p>
              <h2 id="reference-title">All calculators by discipline.</h2>
            </div>
            <p>
              The full suite remains one step away without competing with your
              active rig and recent work.
            </p>
          </div>
          <div className="home-reference-groups">
            {calculatorGroups.map((group) => (
              <details key={group}>
                <summary>
                  {group}
                  <span>
                    {
                      calculatorRegistry.filter((item) => item.group === group)
                        .length
                    }
                  </span>
                </summary>
                <ul>
                  {calculatorRegistry
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <li key={item.slug}>
                        <Link href={`/calculators/${item.slug}`}>
                          <AstroIcon kind={item.icon} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.question}</small>
                          </span>
                          <i>→</i>
                        </Link>
                      </li>
                    ))}
                </ul>
              </details>
            ))}
          </div>
          <div className="home-reference-links">
            <Link href="/find">Open searchable quantity index →</Link>
            <Link href="/calculations">
              Open the complete calculation dossier →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
