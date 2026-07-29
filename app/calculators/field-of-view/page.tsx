import type { Metadata } from "next";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { FieldOfViewLab } from "@/features/field-of-view/components/field-of-view-lab";
import { FieldOfViewPageFrame } from "@/features/field-of-view/components/field-of-view-shell";

export const metadata: Metadata = {
  title: "Field of View Lab",
};

export default function FieldOfViewPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Field Lab · Release 01" />
      <FieldOfViewPageFrame>
        <FieldOfViewLab />
      </FieldOfViewPageFrame>
      <SiteFooter />
    </>
  );
}
