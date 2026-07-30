import "dotenv/config";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { parseDatabaseConfiguration } from "../lib/db/config";
import { PrismaClient, type Prisma } from "../lib/db/generated/prisma/client";
import {
  catalogueSeed,
  type CatalogueAstronomicalTarget,
  type CatalogueCamera,
  type CatalogueManufacturer,
  type CatalogueOpticalModifier,
  type CatalogueTelescope,
} from "./data/catalogue";

const SEED_ACTOR = "repository-seed";

type SeedSnapshot = Record<string, string | number | boolean | null>;

export function resolveSeedDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const databaseUrl =
    environment.MIGRATION_DATABASE_URL ?? environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "MIGRATION_DATABASE_URL or DATABASE_URL is required to seed the catalogue.",
    );
  }

  return databaseUrl;
}

function verifiedDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function canonicalDecimal(value: { toString(): string } | string | number) {
  const [integerPart = "0", fractionalPart] = value.toString().split(".");

  if (!fractionalPart) {
    return integerPart;
  }

  const trimmedFraction = fractionalPart.replace(/0+$/, "");
  return trimmedFraction.length > 0
    ? `${integerPart}.${trimmedFraction}`
    : integerPart;
}

function calendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function snapshotsMatch(left: SeedSnapshot, right: SeedSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function recordChange(
  transaction: Prisma.TransactionClient,
  input: {
    entityType: string;
    entityId: string;
    changeType: "create" | "update";
    before: SeedSnapshot | null;
    after: SeedSnapshot;
    sourceUrl: string;
  },
) {
  await transaction.catalogueChangeLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      changeType: input.changeType,
      ...(input.before ? { beforeJson: input.before } : {}),
      afterJson: input.after,
      sourceUrl: input.sourceUrl,
      changedBy: SEED_ACTOR,
    },
  });
}

function desiredManufacturerSnapshot(
  manufacturer: CatalogueManufacturer,
): SeedSnapshot {
  return {
    slug: manufacturer.slug,
    name: manufacturer.name,
    websiteUrl: manufacturer.websiteUrl,
  };
}

async function seedManufacturer(
  transaction: Prisma.TransactionClient,
  manufacturer: CatalogueManufacturer,
) {
  const existing = await transaction.manufacturer.findUnique({
    where: { slug: manufacturer.slug },
  });
  const desiredSnapshot = desiredManufacturerSnapshot(manufacturer);
  const existingSnapshot = existing
    ? {
        slug: existing.slug,
        name: existing.name,
        websiteUrl: existing.websiteUrl,
      }
    : null;

  if (existing && snapshotsMatch(existingSnapshot!, desiredSnapshot)) {
    return existing;
  }

  const data = {
    slug: manufacturer.slug,
    name: manufacturer.name,
    websiteUrl: manufacturer.websiteUrl,
  };
  const saved = await transaction.manufacturer.upsert({
    where: { slug: manufacturer.slug },
    create: data,
    update: data,
  });

  await recordChange(transaction, {
    entityType: "manufacturer",
    entityId: saved.id,
    changeType: existing ? "update" : "create",
    before: existingSnapshot,
    after: desiredSnapshot,
    sourceUrl: manufacturer.websiteUrl,
  });

  return saved;
}

function desiredTelescopeSnapshot(
  telescope: CatalogueTelescope,
  manufacturerId: string,
): SeedSnapshot {
  return {
    manufacturerId,
    slug: telescope.slug,
    model: telescope.model,
    opticalDesign: telescope.opticalDesign,
    apertureMm: canonicalDecimal(telescope.apertureMm),
    nativeFocalLengthMm: canonicalDecimal(telescope.nativeFocalLengthMm),
    active: telescope.active,
    sourceUrl: telescope.sourceUrl,
    verifiedAt: telescope.verifiedAt,
  };
}

async function seedTelescope(
  transaction: Prisma.TransactionClient,
  telescope: CatalogueTelescope,
  manufacturerId: string,
) {
  const existing = await transaction.telescope.findUnique({
    where: { slug: telescope.slug },
  });
  const desiredSnapshot = desiredTelescopeSnapshot(telescope, manufacturerId);
  const existingSnapshot = existing
    ? {
        manufacturerId: existing.manufacturerId,
        slug: existing.slug,
        model: existing.model,
        opticalDesign: existing.opticalDesign,
        apertureMm: canonicalDecimal(existing.apertureMm),
        nativeFocalLengthMm: canonicalDecimal(existing.nativeFocalLengthMm),
        active: existing.active,
        sourceUrl: existing.sourceUrl,
        verifiedAt: calendarDate(existing.verifiedAt),
      }
    : null;

  if (existing && snapshotsMatch(existingSnapshot!, desiredSnapshot)) {
    return;
  }

  const data = {
    manufacturerId,
    slug: telescope.slug,
    model: telescope.model,
    opticalDesign: telescope.opticalDesign,
    apertureMm: telescope.apertureMm.toString(),
    nativeFocalLengthMm: telescope.nativeFocalLengthMm.toString(),
    active: telescope.active,
    sourceUrl: telescope.sourceUrl,
    verifiedAt: verifiedDate(telescope.verifiedAt),
  };
  const saved = await transaction.telescope.upsert({
    where: { slug: telescope.slug },
    create: data,
    update: data,
  });

  await recordChange(transaction, {
    entityType: "telescope",
    entityId: saved.id,
    changeType: existing ? "update" : "create",
    before: existingSnapshot,
    after: desiredSnapshot,
    sourceUrl: telescope.sourceUrl,
  });
}

function desiredCameraSnapshot(
  camera: CatalogueCamera,
  manufacturerId: string,
): SeedSnapshot {
  return {
    manufacturerId,
    slug: camera.slug,
    model: camera.model,
    sensorName: camera.sensorName,
    sensorWidthMm: canonicalDecimal(camera.sensorWidthMm),
    sensorHeightMm: canonicalDecimal(camera.sensorHeightMm),
    pixelSizeUm: canonicalDecimal(camera.pixelSizeUm),
    resolutionWidthPx: camera.resolutionWidthPx,
    resolutionHeightPx: camera.resolutionHeightPx,
    sensorType: camera.sensorType,
    colourMode: camera.colourMode,
    active: camera.active,
    sourceUrl: camera.sourceUrl,
    verifiedAt: camera.verifiedAt,
  };
}

async function seedCamera(
  transaction: Prisma.TransactionClient,
  camera: CatalogueCamera,
  manufacturerId: string,
) {
  const existing = await transaction.camera.findUnique({
    where: { slug: camera.slug },
  });
  const desiredSnapshot = desiredCameraSnapshot(camera, manufacturerId);
  const existingSnapshot = existing
    ? {
        manufacturerId: existing.manufacturerId,
        slug: existing.slug,
        model: existing.model,
        sensorName: existing.sensorName,
        sensorWidthMm: canonicalDecimal(existing.sensorWidthMm),
        sensorHeightMm: canonicalDecimal(existing.sensorHeightMm),
        pixelSizeUm: canonicalDecimal(existing.pixelSizeUm),
        resolutionWidthPx: existing.resolutionWidthPx,
        resolutionHeightPx: existing.resolutionHeightPx,
        sensorType: existing.sensorType,
        colourMode: existing.colourMode,
        active: existing.active,
        sourceUrl: existing.sourceUrl,
        verifiedAt: calendarDate(existing.verifiedAt),
      }
    : null;

  if (existing && snapshotsMatch(existingSnapshot!, desiredSnapshot)) {
    return;
  }

  const data = {
    manufacturerId,
    slug: camera.slug,
    model: camera.model,
    sensorName: camera.sensorName,
    sensorWidthMm: camera.sensorWidthMm.toString(),
    sensorHeightMm: camera.sensorHeightMm.toString(),
    pixelSizeUm: camera.pixelSizeUm.toString(),
    resolutionWidthPx: camera.resolutionWidthPx,
    resolutionHeightPx: camera.resolutionHeightPx,
    sensorType: camera.sensorType,
    colourMode: camera.colourMode,
    active: camera.active,
    sourceUrl: camera.sourceUrl,
    verifiedAt: verifiedDate(camera.verifiedAt),
  };
  const saved = await transaction.camera.upsert({
    where: { slug: camera.slug },
    create: data,
    update: data,
  });

  await recordChange(transaction, {
    entityType: "camera",
    entityId: saved.id,
    changeType: existing ? "update" : "create",
    before: existingSnapshot,
    after: desiredSnapshot,
    sourceUrl: camera.sourceUrl,
  });
}

function desiredModifierSnapshot(
  modifier: CatalogueOpticalModifier,
  manufacturerId: string,
): SeedSnapshot {
  return {
    manufacturerId,
    slug: modifier.slug,
    model: modifier.model,
    modifierType: modifier.modifierType,
    multiplier: canonicalDecimal(modifier.multiplier),
    compatibleNotes: modifier.compatibleNotes,
    active: modifier.active,
    sourceUrl: modifier.sourceUrl,
    verifiedAt: modifier.verifiedAt,
  };
}

async function seedModifier(
  transaction: Prisma.TransactionClient,
  modifier: CatalogueOpticalModifier,
  manufacturerId: string,
) {
  const existing = await transaction.opticalModifier.findUnique({
    where: { slug: modifier.slug },
  });
  const desiredSnapshot = desiredModifierSnapshot(modifier, manufacturerId);
  const existingSnapshot = existing
    ? {
        manufacturerId: existing.manufacturerId,
        slug: existing.slug,
        model: existing.model,
        modifierType: existing.modifierType,
        multiplier: canonicalDecimal(existing.multiplier),
        compatibleNotes: existing.compatibleNotes,
        active: existing.active,
        sourceUrl: existing.sourceUrl,
        verifiedAt: calendarDate(existing.verifiedAt),
      }
    : null;

  if (existing && snapshotsMatch(existingSnapshot!, desiredSnapshot)) {
    return;
  }

  const data = {
    manufacturerId,
    slug: modifier.slug,
    model: modifier.model,
    modifierType: modifier.modifierType,
    multiplier: modifier.multiplier.toString(),
    compatibleNotes: modifier.compatibleNotes,
    active: modifier.active,
    sourceUrl: modifier.sourceUrl,
    verifiedAt: verifiedDate(modifier.verifiedAt),
  };
  const saved = await transaction.opticalModifier.upsert({
    where: { slug: modifier.slug },
    create: data,
    update: data,
  });

  await recordChange(transaction, {
    entityType: "optical_modifier",
    entityId: saved.id,
    changeType: existing ? "update" : "create",
    before: existingSnapshot,
    after: desiredSnapshot,
    sourceUrl: modifier.sourceUrl,
  });
}

function desiredTargetSnapshot(
  target: CatalogueAstronomicalTarget,
): SeedSnapshot {
  return {
    slug: target.slug,
    catalogueName: target.catalogueName,
    commonName: target.commonName,
    category: target.category,
    angularWidthDeg: canonicalDecimal(target.angularWidthDeg),
    angularHeightDeg: canonicalDecimal(target.angularHeightDeg),
    defaultRotationDeg: canonicalDecimal(target.defaultRotationDeg),
    assetPath: target.assetPath,
    assetCredit: target.assetCredit,
    assetLicenseUrl: target.assetLicenseUrl,
    sourceUrl: target.sourceUrl,
    verifiedAt: target.verifiedAt,
  };
}

async function seedTarget(
  transaction: Prisma.TransactionClient,
  target: CatalogueAstronomicalTarget,
) {
  const existing = await transaction.astronomicalTarget.findUnique({
    where: { slug: target.slug },
  });
  const desiredSnapshot = desiredTargetSnapshot(target);
  const existingSnapshot = existing
    ? {
        slug: existing.slug,
        catalogueName: existing.catalogueName,
        commonName: existing.commonName,
        category: existing.category,
        angularWidthDeg: canonicalDecimal(existing.angularWidthDeg),
        angularHeightDeg: canonicalDecimal(existing.angularHeightDeg),
        defaultRotationDeg: canonicalDecimal(existing.defaultRotationDeg),
        assetPath: existing.assetPath,
        assetCredit: existing.assetCredit,
        assetLicenseUrl: existing.assetLicenseUrl,
        sourceUrl: existing.sourceUrl,
        verifiedAt: calendarDate(existing.verifiedAt),
      }
    : null;

  if (existing && snapshotsMatch(existingSnapshot!, desiredSnapshot)) {
    return;
  }

  const data = {
    slug: target.slug,
    catalogueName: target.catalogueName,
    commonName: target.commonName,
    category: target.category,
    angularWidthDeg: target.angularWidthDeg.toString(),
    angularHeightDeg: target.angularHeightDeg.toString(),
    defaultRotationDeg: target.defaultRotationDeg.toString(),
    assetPath: target.assetPath,
    assetCredit: target.assetCredit,
    assetLicenseUrl: target.assetLicenseUrl,
    sourceUrl: target.sourceUrl,
    verifiedAt: verifiedDate(target.verifiedAt),
  };
  const saved = await transaction.astronomicalTarget.upsert({
    where: { slug: target.slug },
    create: data,
    update: data,
  });

  await recordChange(transaction, {
    entityType: "astronomical_target",
    entityId: saved.id,
    changeType: existing ? "update" : "create",
    before: existingSnapshot,
    after: desiredSnapshot,
    sourceUrl: target.sourceUrl,
  });
}

export async function seedCatalogue(client: PrismaClient) {
  await client.$transaction(
    async (transaction) => {
      const manufacturerIds = new Map<string, string>();

      for (const manufacturer of catalogueSeed.manufacturers) {
        const saved = await seedManufacturer(transaction, manufacturer);
        manufacturerIds.set(manufacturer.slug, saved.id);
      }

      const manufacturerIdFor = (slug: string) => {
        const manufacturerId = manufacturerIds.get(slug);

        if (!manufacturerId) {
          throw new Error(
            `Validated manufacturer reference is missing: ${slug}`,
          );
        }

        return manufacturerId;
      };

      for (const telescope of catalogueSeed.telescopes) {
        await seedTelescope(
          transaction,
          telescope,
          manufacturerIdFor(telescope.manufacturerSlug),
        );
      }

      for (const camera of catalogueSeed.cameras) {
        await seedCamera(
          transaction,
          camera,
          manufacturerIdFor(camera.manufacturerSlug),
        );
      }

      for (const modifier of catalogueSeed.opticalModifiers) {
        await seedModifier(
          transaction,
          modifier,
          manufacturerIdFor(modifier.manufacturerSlug),
        );
      }

      for (const target of catalogueSeed.astronomicalTargets) {
        await seedTarget(transaction, target);
      }
    },
    { timeout: 60_000 },
  );
}

async function main() {
  const databaseUrl = resolveSeedDatabaseUrl(process.env);
  const adapter = new PrismaMariaDb(
    parseDatabaseConfiguration({ DATABASE_URL: databaseUrl }),
  );
  const client = new PrismaClient({ adapter });

  try {
    await seedCatalogue(client);
    console.info(
      `Catalogue seed complete: ${catalogueSeed.telescopes.length} telescopes, ${catalogueSeed.cameras.length} cameras, ${catalogueSeed.opticalModifiers.length} modifiers, and ${catalogueSeed.astronomicalTargets.length} targets.`,
    );
  } finally {
    await client.$disconnect();
  }
}

const invokedPath = process.argv[1];
const isDirectInvocation =
  invokedPath !== undefined &&
  pathToFileURL(resolve(invokedPath)).href === import.meta.url;

if (isDirectInvocation) {
  main().catch(() => {
    console.error("Catalogue seed failed.");
    process.exitCode = 1;
  });
}
