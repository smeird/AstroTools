import type { Metadata } from "next";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { GuidingRatioCalculator } from "@/features/guiding-ratio/components/guiding-ratio-calculator";

export const metadata: Metadata = { title: "Guiding Ratio Calculator" };

export default function GuidingRatioPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <GuidingRatioCalculator />
      <SiteFooter />
    </>
  );
}
