import type { Metadata } from "next";
import { RigCompare } from "@/features/calculator-discovery/components/rig-compare";
import { SiteHeader } from "@/components/design-system/site-header";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SkipLink } from "@/components/design-system/skip-link";
export const metadata: Metadata = {
  title: "Compare Equipment Rigs",
  description:
    "Compare the equipment and observing-site details in two Astrotools bookmark URLs.",
};
export default function ComparePage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Rig Comparison" />
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "clamp(1rem,3vw,3rem)",
        }}
      >
        <p className="eyebrow">Configuration comparison</p>
        <h1>Compare two bookmarked rigs.</h1>
        <p className="lede">
          Paste two shareable equipment URLs to check the optical train, sensor
          and site values side by side before choosing a setup.
        </p>
        <RigCompare />
      </main>
      <SiteFooter />
    </>
  );
}
