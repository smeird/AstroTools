import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { BackfocusSpacingCalculator } from "@/features/backfocus-spacing/components/backfocus-spacing-calculator";

export const metadata: Metadata = { title: "Back-focus Spacing Calculator" };
export default function BackfocusSpacingPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Back-focus Spacing · Release 05" />
      <BackfocusSpacingCalculator />
      <SiteFooter />
    </>
  );
}
