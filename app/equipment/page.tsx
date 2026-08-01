import type { Metadata } from "next";
import { connection } from "next/server";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { loadInitialCatalogue } from "@/app/calculators/field-of-view/page";
import { EquipmentWorkspace } from "@/features/equipment-workspace/components/equipment-workspace";
import {
  extractEquipmentReferences,
  normaliseEquipmentPageSearchParams,
  parseEquipmentState,
} from "@/features/equipment-workspace/schemas/equipment-state";
import type { FieldOfViewPageSearchParams } from "@/features/field-of-view/schemas/shareable-state";
import { supplementFieldOfViewCatalogue } from "@/features/field-of-view/services/calculator-catalogue";

export const metadata: Metadata = { title: "Your Equipment Workspace" };

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<FieldOfViewPageSearchParams>;
}) {
  await connection();
  const [baseCatalogue, rawSearchParams] = await Promise.all([
    loadInitialCatalogue(),
    searchParams,
  ]);
  const normalized = normaliseEquipmentPageSearchParams(rawSearchParams);
  const catalogue = await supplementFieldOfViewCatalogue(
    baseCatalogue,
    extractEquipmentReferences(normalized),
  );
  const parsed = parseEquipmentState(normalized, catalogue);

  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Equipment Workspace" />
      <EquipmentWorkspace
        catalogue={catalogue}
        initialConfiguration={parsed.state}
        restorePersistedState={normalized.size === 0}
        shareNotice={parsed.notice}
      />
      <SiteFooter />
    </>
  );
}
