import type { Metadata } from "next";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { ModifierEffectsCalculator } from "@/features/modifier-effects/components/modifier-effects-calculator";

export const metadata: Metadata = { title: "Focal Reducer and Barlow Effects" };

export default function ModifierEffectsPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Optical Effects · Release 03" />
      <ModifierEffectsCalculator />
      <SiteFooter />
    </>
  );
}
