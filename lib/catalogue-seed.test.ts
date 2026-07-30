import { describe, expect, it } from "vitest";

import {
  CATALOGUE_VERIFICATION_DATE,
  catalogueSeed,
  SENSOR_DIMENSION_TOLERANCE_MM,
  validateCatalogueSeed,
} from "../prisma/data/catalogue";
import { resolveSeedDatabaseUrl } from "../prisma/seed";

function mutableCatalogue() {
  return structuredClone(catalogueSeed);
}

describe("catalogue seed data", () => {
  it("prefers controlled migration credentials for production seeding", () => {
    expect(
      resolveSeedDatabaseUrl({
        DATABASE_URL: "mysql://runtime.example/astrotools",
        MIGRATION_DATABASE_URL: "mysql://migration.example/astrotools",
      }),
    ).toBe("mysql://migration.example/astrotools");
    expect(() => resolveSeedDatabaseUrl({})).toThrow(
      /MIGRATION_DATABASE_URL or DATABASE_URL is required/,
    );
  });

  it("contains the reviewed Work Package 3 catalogue", () => {
    expect(catalogueSeed.manufacturers).toHaveLength(4);
    expect(catalogueSeed.telescopes).toHaveLength(3);
    expect(catalogueSeed.cameras).toHaveLength(2);
    expect(catalogueSeed.opticalModifiers).toHaveLength(2);
    expect(catalogueSeed.astronomicalTargets).toHaveLength(6);
  });

  it("has valid provenance and the agreed verification date", () => {
    for (const manufacturer of catalogueSeed.manufacturers) {
      expect(new URL(manufacturer.websiteUrl).protocol).toBe("https:");
    }

    const sourcedRecords = [
      ...catalogueSeed.telescopes,
      ...catalogueSeed.cameras,
      ...catalogueSeed.opticalModifiers,
      ...catalogueSeed.astronomicalTargets,
    ];

    for (const record of sourcedRecords) {
      expect(new URL(record.sourceUrl).protocol).toBe("https:");
      expect(record.verifiedAt).toBe(CATALOGUE_VERIFICATION_DATE);
    }
  });

  it("keeps every equipment manufacturer reference resolvable", () => {
    const manufacturerSlugs = new Set(
      catalogueSeed.manufacturers.map(({ slug }) => slug),
    );

    for (const record of [
      ...catalogueSeed.telescopes,
      ...catalogueSeed.cameras,
      ...catalogueSeed.opticalModifiers,
    ]) {
      expect(manufacturerSlugs.has(record.manufacturerSlug)).toBe(true);
    }
  });

  it("keeps catalogued camera dimensions within the derived tolerance", () => {
    for (const camera of catalogueSeed.cameras) {
      const derivedWidthMm =
        (camera.resolutionWidthPx * camera.pixelSizeUm) / 1000;
      const derivedHeightMm =
        (camera.resolutionHeightPx * camera.pixelSizeUm) / 1000;

      expect(
        Math.abs(camera.sensorWidthMm - derivedWidthMm),
      ).toBeLessThanOrEqual(SENSOR_DIMENSION_TOLERANCE_MM);
      expect(
        Math.abs(camera.sensorHeightMm - derivedHeightMm),
      ).toBeLessThanOrEqual(SENSOR_DIMENSION_TOLERANCE_MM);
    }
  });

  it("rejects duplicate slugs and natural catalogue references", () => {
    const duplicateSlug = mutableCatalogue();
    duplicateSlug.cameras[1]!.slug = duplicateSlug.cameras[0]!.slug;
    expect(() => validateCatalogueSeed(duplicateSlug)).toThrow(
      /Camera slug duplicates record 1/,
    );

    const duplicateReference = mutableCatalogue();
    duplicateReference.astronomicalTargets[1]!.catalogueName =
      duplicateReference.astronomicalTargets[0]!.catalogueName;
    expect(() => validateCatalogueSeed(duplicateReference)).toThrow(
      /Target catalogue reference duplicates record 1/,
    );
  });

  it("rejects unknown manufacturer references", () => {
    const input = mutableCatalogue();
    input.telescopes[0]!.manufacturerSlug = "unknown-manufacturer";

    expect(() => validateCatalogueSeed(input)).toThrow(
      /Unknown manufacturer reference/,
    );
  });

  it("rejects missing or malformed provenance", () => {
    const insecureSource = mutableCatalogue();
    insecureSource.telescopes[0]!.sourceUrl = "http://example.test/telescope";
    expect(() => validateCatalogueSeed(insecureSource)).toThrow(
      /must use HTTPS/,
    );

    const impossibleDate = mutableCatalogue();
    impossibleDate.cameras[0]!.verifiedAt = "2026-02-30";
    expect(() => validateCatalogueSeed(impossibleDate)).toThrow(
      /real calendar date/,
    );

    const oversizedSource = mutableCatalogue();
    oversizedSource.telescopes[0]!.sourceUrl = `https://example.test/${"x".repeat(2048)}`;
    expect(() => validateCatalogueSeed(oversizedSource)).toThrow();
  });

  it("rejects camera dimension discrepancies over 0.1 mm", () => {
    const input = mutableCatalogue();
    input.cameras[0]!.sensorWidthMm = 24;

    expect(() => validateCatalogueSeed(input)).toThrow(
      /pixel-derived width by more than 0.1 mm/,
    );
  });

  it("requires complete credit and licence metadata for future assets", () => {
    const input = mutableCatalogue();
    input.astronomicalTargets[0]!.assetPath = "/targets/moon.webp";

    expect(() => validateCatalogueSeed(input)).toThrow(
      /path, credit, and licence URL together/,
    );
  });
});
