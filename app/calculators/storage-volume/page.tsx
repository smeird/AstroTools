import type { Metadata } from "next";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { StorageVolumeCalculator } from "@/features/remaining-calculators/components/storage-volume-calculator";
export const metadata: Metadata = {
  title: "Storage and Data Volume Calculator",
};
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <StorageVolumeCalculator />
      <SiteFooter />
    </>
  );
}
