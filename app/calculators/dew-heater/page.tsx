import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { DewHeaterCalculator } from "@/features/remaining-calculators/components/dew-heater-calculator";
export const metadata: Metadata = {
  title: "Dew Point and Heater Power Calculator",
};
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <DewHeaterCalculator />
      <SiteFooter />
    </>
  );
}
