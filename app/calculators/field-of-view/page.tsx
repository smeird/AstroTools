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
  supplementFieldOfViewCatalogue,
  unavailableFieldOfViewCatalogue,
  type FieldOfViewCatalogue,
} from "@/features/field-of-view/services/calculator-catalogue";
import {
  extractFieldOfViewShareReferences,
  normaliseFieldOfViewPageSearchParams,
  parseFieldOfViewShareState,
  type FieldOfViewPageSearchParams,
  type FieldOfViewShareNotice,
} from "@/features/field-of-view/schemas/shareable-state";
import type { EquipmentConfigurationState } from "@/features/field-of-view/model/equipment-configuration";

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
  initialConfiguration,
  shareNotice,
}: {
  catalogue: FieldOfViewCatalogue;
  initialConfiguration?: EquipmentConfigurationState | undefined;
  shareNotice?: FieldOfViewShareNotice | null | undefined;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Field Lab · Release 01" />
      <FieldOfViewPageFrame>
        <FieldOfViewLab
          catalogue={catalogue}
          initialConfiguration={initialConfiguration}
          shareNotice={shareNotice}
        />
      </FieldOfViewPageFrame>
      <SiteFooter />
    </>
  );
}

export default async function FieldOfViewPage({
  searchParams,
}: {
  searchParams: Promise<FieldOfViewPageSearchParams>;
}) {
  await connection();
  const [baseCatalogue, rawSearchParams] = await Promise.all([
    loadInitialCatalogue(),
    searchParams,
  ]);
  const normalizedSearchParams =
    normaliseFieldOfViewPageSearchParams(rawSearchParams);
  const catalogue = await supplementFieldOfViewCatalogue(
    baseCatalogue,
    extractFieldOfViewShareReferences(normalizedSearchParams),
  );
  const sharedState = parseFieldOfViewShareState(
    normalizedSearchParams,
    catalogue,
  );

  return (
    <FieldOfViewPageView
      catalogue={catalogue}
      initialConfiguration={sharedState.state}
      shareNotice={sharedState.notice}
    />
  );
}
