import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATALOGUE_VERIFICATION_DATE,
  catalogueSeed,
  SENSOR_DIMENSION_TOLERANCE_MM,
  validateCatalogueSeed,
} from "../prisma/data/catalogue";
import { resolveSeedDatabaseUrl, validateSeedTargetSvgs } from "../prisma/seed";
import { validateStaticTargetSvg } from "./security/static-svg";

function mutableCatalogue() {
  return structuredClone(catalogueSeed);
}

describe("catalogue seed data", () => {
  it("prefers controlled migration credentials for production seeding", () => {
    expect(
      resolveSeedDatabaseUrl({
        DATABASE_URL: "postgresql://runtime.example/astrotools",
        MIGRATION_DATABASE_URL: "postgresql://migration.example/astrotools",
      }),
    ).toBe("postgresql://migration.example/astrotools");
    expect(() => resolveSeedDatabaseUrl({})).toThrow(
      /MIGRATION_DATABASE_URL or DATABASE_URL is required/,
    );
  });

  it("contains the reviewed Work Package 28 catalogue", () => {
    expect(catalogueSeed.manufacturers).toHaveLength(5);
    expect(catalogueSeed.telescopes).toHaveLength(50);
    expect(catalogueSeed.cameras).toHaveLength(3);
    expect(catalogueSeed.opticalModifiers).toHaveLength(10);
    expect(catalogueSeed.astronomicalTargets).toHaveLength(6);
  });

  it("covers multiple telescope vendors and explicit optical families", () => {
    expect(
      new Set(
        catalogueSeed.telescopes.map(
          ({ manufacturerSlug }) => manufacturerSlug,
        ),
      ),
    ).toEqual(
      new Set([
        "william-optics",
        "celestron",
        "sky-watcher",
        "planewave-instruments",
      ]),
    );

    const designs = catalogueSeed.telescopes.map(({ opticalDesign }) =>
      opticalDesign.toLowerCase(),
    );
    expect(designs.some((design) => design.includes("refractor"))).toBe(true);
    expect(designs.some((design) => design.includes("newtonian"))).toBe(true);
    expect(
      designs.some((design) => design.includes("schmidt-cassegrain")),
    ).toBe(true);
    expect(designs.some((design) => design.includes("dall-kirkham"))).toBe(
      true,
    );

    for (const telescope of catalogueSeed.telescopes) {
      expect(telescope.opticalDesign.trim()).not.toBe("");
      expect(new URL(telescope.sourceUrl).hostname).not.toBe("example.com");
    }
  });

  it("includes the user's EdgeHD 11 imaging configuration", () => {
    expect(
      catalogueSeed.telescopes.find(
        ({ slug }) => slug === "edgehd-11-optical-tube-assembly",
      ),
    ).toMatchObject({
      apertureMm: 279.4,
      nativeFocalLengthMm: 2800,
      sourceUrl:
        "https://www.celestron.com/products/edgehd-11-optical-tube-assembly-cge-dovetail",
    });
    expect(
      catalogueSeed.cameras.find(({ slug }) => slug === "asi1600mm-pro"),
    ).toMatchObject({
      sensorName: "Panasonic MN34230ALJ",
      sensorWidthMm: 17.6,
      sensorHeightMm: 13.3,
      pixelSizeUm: 3.8,
      resolutionWidthPx: 4656,
      resolutionHeightPx: 3520,
      colourMode: "monochrome",
    });
    expect(
      catalogueSeed.opticalModifiers.find(
        ({ slug }) => slug === "reducer-lens-0-7x-edgehd-1100",
      ),
    ).toMatchObject({ multiplier: 0.7 });
    expect(
      catalogueSeed.opticalModifiers.find(
        ({ slug }) => slug === "fastar-hyperstar-f-2-edgehd-1100",
      ),
    ).toMatchObject({ multiplier: 0.2 });
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
      expect([
        CATALOGUE_VERIFICATION_DATE,
        "2026-08-01",
        "2026-08-02",
      ]).toContain(record.verifiedAt);
    }
  });

  it("stores target orientation as a canonical north-through-east position angle", () => {
    for (const target of catalogueSeed.astronomicalTargets) {
      expect(target.defaultRotationDeg).toBeGreaterThanOrEqual(0);
      expect(target.defaultRotationDeg).toBeLessThan(180);
    }

    expect(
      catalogueSeed.astronomicalTargets.find(
        ({ slug }) => slug === "m31-andromeda-galaxy",
      ),
    ).toMatchObject({
      angularWidthDeg: 3.3255,
      angularHeightDeg: 1.179833,
      defaultRotationDeg: 35,
      sourceUrl:
        "https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Messier+31",
    });
    expect(
      catalogueSeed.astronomicalTargets.find(
        ({ slug }) => slug === "ngc-2237-rosette-nebula",
      ),
    ).toMatchObject({
      angularWidthDeg: 2.1,
      angularHeightDeg: 1.916667,
      defaultRotationDeg: 90,
      framingNote:
        "Planning proxy based on the cited 126 × 115 arcminute north-up, east-left image frame; not a calibrated boundary of the nebula.",
      sourceUrl: "https://www.ing.iac.es/PR/press/rosette.html",
    });

    expect(
      catalogueSeed.astronomicalTargets
        .filter(({ slug }) => slug !== "ngc-2237-rosette-nebula")
        .every(({ framingNote }) => framingNote === null),
    ).toBe(true);
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

  it("rejects target position angles outside the canonical interval", () => {
    for (const invalidPositionAngle of [-0.01, 180]) {
      const input = mutableCatalogue();
      input.astronomicalTargets[0]!.defaultRotationDeg = invalidPositionAngle;

      expect(() => validateCatalogueSeed(input)).toThrow();
    }
  });

  it("rejects blank or oversized target framing qualifications", () => {
    for (const invalidFramingNote of ["   ", "x".repeat(1025)]) {
      const input = mutableCatalogue();
      input.astronomicalTargets[0]!.framingNote = invalidFramingNote;

      expect(() => validateCatalogueSeed(input)).toThrow();
    }
  });

  it("rejects camera dimension discrepancies over 0.1 mm", () => {
    const input = mutableCatalogue();
    input.cameras[0]!.sensorWidthMm = 24;

    expect(() => validateCatalogueSeed(input)).toThrow(
      /pixel-derived width by more than 0.1 mm/,
    );
  });

  it("requires complete credit and licence metadata for target assets", () => {
    const input = mutableCatalogue();
    input.astronomicalTargets[0]!.assetCredit = null;

    expect(() => validateCatalogueSeed(input)).toThrow(
      /path, credit, and licence URL together/,
    );
  });

  it("allows only safe local target asset paths", () => {
    for (const unsafePath of [
      "https://example.test/moon.svg",
      "/targets/../secrets.svg",
      "/uploads/moon.svg",
      "/targets/moon.html",
    ]) {
      const input = mutableCatalogue();
      input.astronomicalTargets[0]!.assetPath = unsafePath;

      expect(() => validateCatalogueSeed(input)).toThrow(
        /safe local path under \/targets\//,
      );
    }
  });

  it("ships deterministic local illustrations with complete attribution", () => {
    for (const target of catalogueSeed.astronomicalTargets) {
      expect(target.assetPath).toMatch(/^\/targets\/.+\.svg$/);
      expect(target.assetCredit).toBe(
        "Astrotools target illustration, CC BY 4.0",
      );
      expect(target.assetLicenseUrl).toBe(
        "https://creativecommons.org/licenses/by/4.0/",
      );

      if (!target.assetPath) {
        throw new Error(`Target ${target.slug} has no local illustration.`);
      }

      const source = readFileSync(
        new URL("../public" + target.assetPath, import.meta.url),
        "utf8",
      );
      expect(() => validateStaticTargetSvg(source)).not.toThrow();
    }

    expect(() =>
      validateSeedTargetSvgs(resolve(process.cwd(), "public")),
    ).not.toThrow();
  });
});
