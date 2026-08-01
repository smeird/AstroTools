import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { PolarAlignmentDriftCalculator } from "@/features/polar-alignment-drift/components/polar-alignment-drift-calculator";
export const metadata: Metadata = {
  title: "Drift and Polar Alignment Calculator",
};
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <PolarAlignmentDriftCalculator />
      <SiteFooter />
    </>
  );
}
