import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { MosaicPlanningCalculator } from "@/features/mosaic-planning/components/mosaic-planning-calculator";
export const metadata: Metadata = { title: "Mosaic Planning Calculator" };
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <MosaicPlanningCalculator />
      <SiteFooter />
    </>
  );
}
