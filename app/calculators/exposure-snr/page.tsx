import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { ExposureSnrCalculator } from "@/features/exposure-snr/components/exposure-snr-calculator";
export const metadata: Metadata = {
  title: "Exposure and Signal-to-Noise Calculator",
};
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <ExposureSnrCalculator />
      <SiteFooter />
    </>
  );
}
