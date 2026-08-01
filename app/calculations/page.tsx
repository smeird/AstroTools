import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { CalculationsOverview } from "@/features/calculations-overview/components/calculations-overview";
export const metadata: Metadata = { title: "All Calculations" };
export default function CalculationsPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <CalculationsOverview />
      <SiteFooter />
    </>
  );
}
