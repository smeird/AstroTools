import type { Metadata } from "next";
import { CalculatorFinder } from "@/features/calculator-discovery/components/calculator-finder";
import { SiteHeader } from "@/components/design-system/site-header";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SkipLink } from "@/components/design-system/skip-link";

export const metadata: Metadata = {
  title: "Find a Calculation",
  description:
    "Search every Astrotools calculator by quantity, formula, equipment input or the question you need answered.",
};
export default function FindPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Calculation Reference" />
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          maxWidth: "100rem",
          margin: "0 auto",
          padding: "clamp(1rem,3vw,3rem)",
        }}
      >
        <p className="eyebrow">Calculator and quantity index</p>
        <h1>What do you need to work out?</h1>
        <p className="lede">
          Search in the language you use at the telescope. Results explain what
          each calculator answers, which inputs it needs and how certain its
          model is.
        </p>
        <CalculatorFinder />
      </main>
      <SiteFooter />
    </>
  );
}
