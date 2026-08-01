import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import {
  advancedCalculatorDefinitions,
  type AdvancedCalculatorKind,
} from "@/features/advanced-planning/advanced-calculator-definitions";
import { AdvancedCalculator } from "@/features/advanced-planning/components/advanced-calculator";

const slugs = Object.keys(
  advancedCalculatorDefinitions,
) as AdvancedCalculatorKind[];

function isAdvancedCalculatorKind(
  value: string,
): value is AdvancedCalculatorKind {
  return slugs.includes(value as AdvancedCalculatorKind);
}

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isAdvancedCalculatorKind(slug)) return {};
  return { title: `${advancedCalculatorDefinitions[slug].eyebrow} Calculator` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isAdvancedCalculatorKind(slug)) notFound();
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <AdvancedCalculator kind={slug} />
      <SiteFooter />
    </>
  );
}
