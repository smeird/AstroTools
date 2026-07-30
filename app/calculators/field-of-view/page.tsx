import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { FieldOfViewLab } from "@/features/field-of-view/components/field-of-view-lab";
import { FieldOfViewPageFrame } from "@/features/field-of-view/components/field-of-view-shell";
import {
  FIELD_OF_VIEW_CATALOGUE_CACHE_TAG,
  FIELD_OF_VIEW_CATALOGUE_REVALIDATE_SECONDS,
  loadFieldOfViewCatalogue,
  unavailableFieldOfViewCatalogue,
  type FieldOfViewCatalogue,
} from "@/features/field-of-view/services/calculator-catalogue";

export const metadata: Metadata = {
  title: "Field of View Lab",
};

const loadCachedCatalogue = unstable_cache(
  loadFieldOfViewCatalogue,
  ["field-of-view-calculator-catalogue-v1"],
  {
    revalidate: FIELD_OF_VIEW_CATALOGUE_REVALIDATE_SECONDS,
    tags: [FIELD_OF_VIEW_CATALOGUE_CACHE_TAG],
  },
);

export async function loadInitialCatalogue(
  loadCatalogue: () => Promise<FieldOfViewCatalogue> = loadCachedCatalogue,
): Promise<FieldOfViewCatalogue> {
  try {
    return await loadCatalogue();
  } catch {
    return unavailableFieldOfViewCatalogue();
  }
}

export function FieldOfViewPageView({
  catalogue,
}: {
  catalogue: FieldOfViewCatalogue;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Field Lab · Release 01" />
      <FieldOfViewPageFrame>
        <FieldOfViewLab catalogue={catalogue} />
      </FieldOfViewPageFrame>
      <SiteFooter />
    </>
  );
}

export default async function FieldOfViewPage() {
  await connection();
  return <FieldOfViewPageView catalogue={await loadInitialCatalogue()} />;
}
