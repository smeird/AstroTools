import type { Metadata } from "next";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { ResolutionAndSamplingCalculator } from "@/features/resolution-and-sampling/components/resolution-and-sampling-calculator";

export const metadata: Metadata = {
  title: "Resolution and Sampling",
};

export default function ResolutionAndSamplingPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Resolution · Release 02" />
      <ResolutionAndSamplingCalculator />
      <SiteFooter />
    </>
  );
}
