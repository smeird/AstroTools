import { z } from "zod";

import { MAX_CATALOGUE_SLUG_LENGTH } from "@/lib/catalogue-constants";

export const SENSOR_DIMENSION_TOLERANCE_MM = 0.1;
export const CATALOGUE_VERIFICATION_DATE = "2026-07-30";

const slugSchema = z
  .string()
  .min(1)
  .max(MAX_CATALOGUE_SLUG_LENGTH)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slugs must contain lowercase letters, numbers, and single hyphens only.",
  );

const textSchema = z.string().trim().min(1);
const sourceUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Catalogue provenance URLs must use HTTPS.",
  });
const verifiedDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO 8601 calendar date.")
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    },
    { message: "Verification date must be a real calendar date." },
  );
const positiveMeasurementSchema = z.number().finite().positive();
const targetAssetPathSchema = z
  .string()
  .trim()
  .max(255)
  .regex(
    /^\/targets\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:avif|png|svg|webp)$/,
    "Target assets must use a safe local path under /targets/.",
  );

const manufacturerSchema = z
  .object({
    slug: slugSchema,
    name: textSchema.max(255),
    websiteUrl: sourceUrlSchema,
  })
  .strict();

const telescopeSchema = z
  .object({
    manufacturerSlug: slugSchema,
    slug: slugSchema,
    model: textSchema.max(255),
    opticalDesign: textSchema.max(255),
    apertureMm: positiveMeasurementSchema,
    nativeFocalLengthMm: positiveMeasurementSchema,
    active: z.boolean(),
    sourceUrl: sourceUrlSchema,
    verifiedAt: verifiedDateSchema,
  })
  .strict();

const cameraSchema = z
  .object({
    manufacturerSlug: slugSchema,
    slug: slugSchema,
    model: textSchema.max(255),
    sensorName: textSchema.max(255),
    sensorWidthMm: positiveMeasurementSchema,
    sensorHeightMm: positiveMeasurementSchema,
    pixelSizeUm: positiveMeasurementSchema,
    resolutionWidthPx: z.number().int().positive(),
    resolutionHeightPx: z.number().int().positive(),
    sensorType: textSchema.max(100),
    colourMode: textSchema.max(100),
    active: z.boolean(),
    sourceUrl: sourceUrlSchema,
    verifiedAt: verifiedDateSchema,
  })
  .strict();

const opticalModifierSchema = z
  .object({
    manufacturerSlug: slugSchema,
    slug: slugSchema,
    model: textSchema.max(255),
    modifierType: textSchema.max(100),
    multiplier: positiveMeasurementSchema.max(10),
    compatibleNotes: textSchema.nullable(),
    active: z.boolean(),
    sourceUrl: sourceUrlSchema,
    verifiedAt: verifiedDateSchema,
  })
  .strict();

const targetSchema = z
  .object({
    slug: slugSchema,
    catalogueName: textSchema.max(255),
    commonName: textSchema.max(255),
    category: textSchema.max(100),
    angularWidthDeg: positiveMeasurementSchema.max(360),
    angularHeightDeg: positiveMeasurementSchema.max(180),
    // Astronomical position angle: degrees from celestial north through east.
    // Rectangle axes repeat at 180°, so the canonical stored interval is
    // inclusive of 0° and exclusive of 180°.
    defaultRotationDeg: z.number().finite().min(0).lt(180),
    assetPath: targetAssetPathSchema.nullable().default(null),
    assetCredit: textSchema.max(1024).nullable().default(null),
    assetLicenseUrl: sourceUrlSchema.nullable().default(null),
    framingNote: textSchema.max(1024).nullable().default(null),
    sourceUrl: sourceUrlSchema,
    verifiedAt: verifiedDateSchema,
  })
  .strict();

function reportDuplicates<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
  path: string,
  field: string,
  description: string,
  context: z.core.$RefinementCtx,
) {
  const firstIndexByKey = new Map<string, number>();

  values.forEach((value, index) => {
    const key = keyOf(value).toLocaleLowerCase("en-GB");
    const firstIndex = firstIndexByKey.get(key);

    if (firstIndex === undefined) {
      firstIndexByKey.set(key, index);
      return;
    }

    context.addIssue({
      code: "custom",
      path: [path, index, field],
      message: `${description} duplicates record ${firstIndex + 1}.`,
    });
  });
}

export const catalogueSeedSchema = z
  .object({
    manufacturers: z.array(manufacturerSchema).min(1),
    telescopes: z.array(telescopeSchema),
    cameras: z.array(cameraSchema),
    opticalModifiers: z.array(opticalModifierSchema),
    astronomicalTargets: z.array(targetSchema),
  })
  .strict()
  .superRefine((catalogue, context) => {
    reportDuplicates(
      catalogue.manufacturers,
      ({ slug }) => slug,
      "manufacturers",
      "slug",
      "Manufacturer slug",
      context,
    );
    reportDuplicates(
      catalogue.manufacturers,
      ({ websiteUrl }) => websiteUrl,
      "manufacturers",
      "websiteUrl",
      "Manufacturer website",
      context,
    );

    const manufacturerSlugs = new Set(
      catalogue.manufacturers.map(({ slug }) => slug),
    );

    const referencedCollections = [
      ["telescopes", catalogue.telescopes],
      ["cameras", catalogue.cameras],
      ["opticalModifiers", catalogue.opticalModifiers],
    ] as const;

    for (const [collectionName, records] of referencedCollections) {
      records.forEach(({ manufacturerSlug }, index) => {
        if (!manufacturerSlugs.has(manufacturerSlug)) {
          context.addIssue({
            code: "custom",
            path: [collectionName, index, "manufacturerSlug"],
            message: `Unknown manufacturer reference: ${manufacturerSlug}.`,
          });
        }
      });
    }

    reportDuplicates(
      catalogue.telescopes,
      ({ slug }) => slug,
      "telescopes",
      "slug",
      "Telescope slug",
      context,
    );
    reportDuplicates(
      catalogue.telescopes,
      ({ manufacturerSlug, model }) => `${manufacturerSlug}\u0000${model}`,
      "telescopes",
      "model",
      "Telescope manufacturer/model reference",
      context,
    );
    reportDuplicates(
      catalogue.cameras,
      ({ slug }) => slug,
      "cameras",
      "slug",
      "Camera slug",
      context,
    );
    reportDuplicates(
      catalogue.cameras,
      ({ manufacturerSlug, model }) => `${manufacturerSlug}\u0000${model}`,
      "cameras",
      "model",
      "Camera manufacturer/model reference",
      context,
    );
    reportDuplicates(
      catalogue.opticalModifiers,
      ({ slug }) => slug,
      "opticalModifiers",
      "slug",
      "Optical modifier slug",
      context,
    );
    reportDuplicates(
      catalogue.opticalModifiers,
      ({ manufacturerSlug, model }) => `${manufacturerSlug}\u0000${model}`,
      "opticalModifiers",
      "model",
      "Optical modifier manufacturer/model reference",
      context,
    );
    reportDuplicates(
      catalogue.astronomicalTargets,
      ({ slug }) => slug,
      "astronomicalTargets",
      "slug",
      "Target slug",
      context,
    );
    reportDuplicates(
      catalogue.astronomicalTargets,
      ({ catalogueName }) => catalogueName,
      "astronomicalTargets",
      "catalogueName",
      "Target catalogue reference",
      context,
    );

    catalogue.cameras.forEach((camera, index) => {
      const derivedWidthMm =
        (camera.resolutionWidthPx * camera.pixelSizeUm) / 1000;
      const derivedHeightMm =
        (camera.resolutionHeightPx * camera.pixelSizeUm) / 1000;

      if (
        Math.abs(camera.sensorWidthMm - derivedWidthMm) >
        SENSOR_DIMENSION_TOLERANCE_MM + Number.EPSILON
      ) {
        context.addIssue({
          code: "custom",
          path: ["cameras", index, "sensorWidthMm"],
          message: `Catalogue width differs from the pixel-derived width by more than ${SENSOR_DIMENSION_TOLERANCE_MM} mm.`,
        });
      }

      if (
        Math.abs(camera.sensorHeightMm - derivedHeightMm) >
        SENSOR_DIMENSION_TOLERANCE_MM + Number.EPSILON
      ) {
        context.addIssue({
          code: "custom",
          path: ["cameras", index, "sensorHeightMm"],
          message: `Catalogue height differs from the pixel-derived height by more than ${SENSOR_DIMENSION_TOLERANCE_MM} mm.`,
        });
      }
    });

    catalogue.astronomicalTargets.forEach((target, index) => {
      const assetFields = [
        target.assetPath,
        target.assetCredit,
        target.assetLicenseUrl,
      ];
      const suppliedAssetFields = assetFields.filter(
        (value) => value !== null,
      ).length;

      if (suppliedAssetFields > 0 && suppliedAssetFields < assetFields.length) {
        context.addIssue({
          code: "custom",
          path: ["astronomicalTargets", index, "assetPath"],
          message:
            "A target asset must include its path, credit, and licence URL together.",
        });
      }
    });
  });

export type CatalogueSeed = z.infer<typeof catalogueSeedSchema>;
export type CatalogueManufacturer = CatalogueSeed["manufacturers"][number];
export type CatalogueTelescope = CatalogueSeed["telescopes"][number];
export type CatalogueCamera = CatalogueSeed["cameras"][number];
export type CatalogueOpticalModifier =
  CatalogueSeed["opticalModifiers"][number];
export type CatalogueAstronomicalTarget =
  CatalogueSeed["astronomicalTargets"][number];

export function validateCatalogueSeed(input: unknown): CatalogueSeed {
  return catalogueSeedSchema.parse(input);
}

export const catalogueSeed = validateCatalogueSeed({
  manufacturers: [
    {
      slug: "william-optics",
      name: "William Optics",
      websiteUrl: "https://williamoptics.com/",
    },
    {
      slug: "celestron",
      name: "Celestron",
      websiteUrl: "https://www.celestron.com/",
    },
    {
      slug: "sky-watcher",
      name: "Sky-Watcher",
      websiteUrl: "https://www.skywatcherusa.com/",
    },
    {
      slug: "planewave-instruments",
      name: "PlaneWave Instruments",
      websiteUrl: "https://planewave.com/",
    },
    {
      slug: "zwo",
      name: "ZWO",
      websiteUrl: "https://www.zwoastro.com/",
    },
  ],
  telescopes: [
    {
      manufacturerSlug: "william-optics",
      slug: "cat-51-wifd",
      model: "Cat 51 WIFD",
      opticalDesign: "4-element Petzval",
      apertureMm: 51,
      nativeFocalLengthMm: 250,
      active: true,
      sourceUrl: "https://support.williamoptics.com/products/cat-51-wifd",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "william-optics",
      slug: "pleiades-68",
      model: "Pleiades 68",
      opticalDesign: "7-element Petzval astrograph refractor",
      apertureMm: 68,
      nativeFocalLengthMm: 260,
      active: true,
      sourceUrl: "https://support.williamoptics.com/products/pleiades-68",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c6-optical-tube-assembly",
      model: "C6-A Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 150,
      nativeFocalLengthMm: 1500,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/c6-optical-tube-assembly-cg-5-dovetail",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c8-optical-tube-assembly",
      model: "C8-A Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 203.2,
      nativeFocalLengthMm: 2032,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/c8-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c11-optical-tube-assembly",
      model: "C11-A Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 279.4,
      nativeFocalLengthMm: 2800,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/c11-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c14-optical-tube-assembly",
      model: "C14-A Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 355.6,
      nativeFocalLengthMm: 3910,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/c14-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "celestron",
      slug: "edgehd-8-optical-tube-assembly",
      model: "EdgeHD 8-inch Optical Tube Assembly",
      opticalDesign: "EdgeHD Schmidt-Cassegrain",
      apertureMm: 203.2,
      nativeFocalLengthMm: 2032,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/edgehd-8-optical-tube-assembly-cge-dovetail",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "celestron",
      slug: "edgehd-11-optical-tube-assembly",
      model: "EdgeHD 11-inch Optical Tube Assembly",
      opticalDesign: "EdgeHD aplanatic Schmidt-Cassegrain",
      apertureMm: 279.4,
      nativeFocalLengthMm: 2800,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/edgehd-11-optical-tube-assembly-cge-dovetail",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "evostar-80edx-apo-refractor",
      model: "Evostar 80EDX APO Refractor",
      opticalDesign: "ED doublet apochromatic refractor",
      apertureMm: 80,
      nativeFocalLengthMm: 600,
      active: true,
      sourceUrl: "https://www.skywatcherusa.com/products/evostar-80edx",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "heritage-130-tabletop-dobsonian",
      model: "Heritage 130 Tabletop Dobsonian",
      opticalDesign: "Parabolic Newtonian reflector",
      apertureMm: 130,
      nativeFocalLengthMm: 650,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/heritage-130-tabletop-dobsonian",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "heritage-150-tabletop-dobsonian",
      model: "Heritage 150 Tabletop Dobsonian",
      opticalDesign: "Parabolic Newtonian reflector",
      apertureMm: 150,
      nativeFocalLengthMm: 750,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/heritage-150-tabletop-dobsonian",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "planewave-instruments",
      slug: "cdk12-5-ota",
      model: "CDK12.5 Optical Tube Assembly",
      opticalDesign: "Corrected Dall-Kirkham reflector",
      apertureMm: 318,
      nativeFocalLengthMm: 2541,
      active: true,
      sourceUrl: "https://planewave.com/products/cdk12-5-ota/",
      verifiedAt: "2026-08-01",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "redcat-51",
      model: "RedCat 51",
      opticalDesign: "4-element Petzval astrograph refractor",
      apertureMm: 51,
      nativeFocalLengthMm: 250,
      active: true,
      sourceUrl: "https://williamoptics.com/redcat-51",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "redcat-61",
      model: "RedCat 61",
      opticalDesign: "4-element Petzval astrograph refractor",
      apertureMm: 61,
      nativeFocalLengthMm: 300,
      active: true,
      sourceUrl: "https://williamoptics.com/products/redcat-61",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "zenithstar-61-ii",
      model: "ZenithStar 61 II",
      opticalDesign: "ED doublet apochromatic refractor",
      apertureMm: 61,
      nativeFocalLengthMm: 360,
      active: true,
      sourceUrl: "https://williamoptics.com/zenithstar-61-ii",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "gran-turismo-71",
      model: "Gran Turismo 71",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 71,
      nativeFocalLengthMm: 420,
      active: true,
      sourceUrl: "https://williamoptics.com/gran-turismo-71",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "gran-turismo-81-iv",
      model: "Gran Turismo 81 IV",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 81,
      nativeFocalLengthMm: 478,
      active: true,
      sourceUrl: "https://williamoptics.com/products/gran-turismo-81-iv",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "flt-91",
      model: "FLT 91",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 91,
      nativeFocalLengthMm: 540,
      active: true,
      sourceUrl: "https://williamoptics.com/flt-91",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "flt-120",
      model: "FLT 120",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 120,
      nativeFocalLengthMm: 900,
      active: true,
      sourceUrl: "https://williamoptics.com/flt-120",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "flt-132",
      model: "FLT 132",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 132,
      nativeFocalLengthMm: 925,
      active: true,
      sourceUrl: "https://williamoptics.com/flt-132",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "william-optics",
      slug: "pleiades-111",
      model: "Pleiades 111",
      opticalDesign: "7-element Petzval astrograph refractor",
      apertureMm: 111,
      nativeFocalLengthMm: 528,
      active: true,
      sourceUrl: "https://williamoptics.com/products/pleiades-111",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c5-optical-tube-assembly",
      model: "C5 Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 127,
      nativeFocalLengthMm: 1250,
      active: true,
      sourceUrl: "https://www.celestron.com/products/c5-optical-tube-assembly",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "c9-25-optical-tube-assembly",
      model: "C9.25 Optical Tube Assembly",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 235,
      nativeFocalLengthMm: 2350,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/c9-25-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "edgehd-9-25",
      model: "EdgeHD 9.25 Optical Tube Assembly",
      opticalDesign: "EdgeHD aplanatic Schmidt-Cassegrain",
      apertureMm: 235,
      nativeFocalLengthMm: 2350,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/advanced-vx-9-25-edgehd-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "edgehd-14",
      model: "EdgeHD 14 Optical Tube Assembly",
      opticalDesign: "EdgeHD aplanatic Schmidt-Cassegrain",
      apertureMm: 356,
      nativeFocalLengthMm: 3910,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/edgehd-14-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "rasa-8",
      model: "Rowe-Ackermann Schmidt Astrograph 8",
      opticalDesign: "Rowe-Ackermann Schmidt astrograph",
      apertureMm: 203,
      nativeFocalLengthMm: 400,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/8-rowe-ackermann-schmidt-astrograph-rasa-8-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "rasa-11",
      model: "Rowe-Ackermann Schmidt Astrograph 11",
      opticalDesign: "Rowe-Ackermann Schmidt astrograph",
      apertureMm: 279,
      nativeFocalLengthMm: 620,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/11-in-rowe-ackermann-schmidt-astrograph-rasa-11-optical-tube-assembly-cge-dovetail",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "rasa-14",
      model: "Rowe-Ackermann Schmidt Astrograph 14",
      opticalDesign: "Rowe-Ackermann Schmidt astrograph",
      apertureMm: 356,
      nativeFocalLengthMm: 790,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/rowe-ackermann-schmidt-astrograph-rasa-14",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "starsense-explorer-dx-130az",
      model: "StarSense Explorer DX 130AZ",
      opticalDesign: "Newtonian reflector",
      apertureMm: 130,
      nativeFocalLengthMm: 650,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/starsense-explorer-dx-130az",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "starsense-explorer-8-dobsonian",
      model: "StarSense Explorer 8-inch Dobsonian",
      opticalDesign: "Newtonian reflector",
      apertureMm: 203,
      nativeFocalLengthMm: 1200,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/starsense-explorer-8-dobsonian",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "starsense-explorer-12-dobsonian",
      model: "StarSense Explorer 12-inch Dobsonian",
      opticalDesign: "Newtonian reflector",
      apertureMm: 305,
      nativeFocalLengthMm: 1500,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/starsense-explorer-12-dobsonian",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "esprit-80ed",
      model: "Esprit 80ED Triplet APO",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 80,
      nativeFocalLengthMm: 400,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/esprit-80mm-ed-triplet-apo-refractor",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "esprit-100ed",
      model: "Esprit 100ED Triplet APO",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 100,
      nativeFocalLengthMm: 550,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/esprit-100mm-ed-triplet-apo-refractor",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "esprit-120ed",
      model: "Esprit 120ED Triplet APO",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 120,
      nativeFocalLengthMm: 840,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/esprit-120mm-ed-triplet-apo-refractor",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "esprit-150ed",
      model: "Esprit 150ED Triplet APO",
      opticalDesign: "ED triplet apochromatic refractor",
      apertureMm: 150,
      nativeFocalLengthMm: 1050,
      active: false,
      sourceUrl:
        "https://www.skywatcherusa.com/products/esprit-150mm-ed-triplet-apo-refractor",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "quattro-150p",
      model: "Quattro 150P Imaging Newtonian",
      opticalDesign: "Newtonian reflector",
      apertureMm: 150,
      nativeFocalLengthMm: 600,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/quattro-150p-imaging-newtonian-6",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "quattro-200p",
      model: "Quattro 200P Imaging Newtonian",
      opticalDesign: "Newtonian reflector",
      apertureMm: 200,
      nativeFocalLengthMm: 800,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/quattro-200p-imaging-newtonian-8",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "skymax-127",
      model: "Skymax 127 Maksutov-Cassegrain",
      opticalDesign: "Maksutov-Cassegrain",
      apertureMm: 127,
      nativeFocalLengthMm: 1500,
      active: true,
      sourceUrl: "https://www.skywatcherusa.com/products/skymax-127",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "flextube-250p",
      model: "Flextube 250P SynScan Dobsonian",
      opticalDesign: "Newtonian reflector",
      apertureMm: 254,
      nativeFocalLengthMm: 1200,
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/sky-watcher-flextube-250p-synscan",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "planewave-instruments",
      slug: "cdk14",
      model: "CDK14 Optical Tube Assembly",
      opticalDesign: "Corrected Dall-Kirkham reflector",
      apertureMm: 356,
      nativeFocalLengthMm: 2563,
      active: true,
      sourceUrl: "https://planewave.com/products/cdk14-f-7-2-series-package/",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "planewave-instruments",
      slug: "cdk17",
      model: "CDK17 Optical Tube Assembly",
      opticalDesign: "Corrected Dall-Kirkham reflector",
      apertureMm: 432,
      nativeFocalLengthMm: 2936,
      active: true,
      sourceUrl: "https://planewave.com/products/cdk17/",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "planewave-instruments",
      slug: "cdk20",
      model: "CDK20 Optical Tube Assembly",
      opticalDesign: "Corrected Dall-Kirkham reflector",
      apertureMm: 508,
      nativeFocalLengthMm: 3912,
      active: true,
      sourceUrl: "https://planewave.com/products/cdk20/",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "planewave-instruments",
      slug: "cdk24",
      model: "CDK24 Optical Tube Assembly",
      opticalDesign: "Corrected Dall-Kirkham reflector",
      apertureMm: 610,
      nativeFocalLengthMm: 3965,
      active: true,
      sourceUrl: "https://planewave.com/products/cdk24/",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "cpc-1100",
      model: "CPC 1100 GPS",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 279,
      nativeFocalLengthMm: 2800,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/cpc-1100-gps-xlt-computerized-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "cpc-deluxe-925",
      model: "CPC Deluxe 925 HD",
      opticalDesign: "EdgeHD aplanatic Schmidt-Cassegrain",
      apertureMm: 235,
      nativeFocalLengthMm: 2350,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/cpc-deluxe-925-hd-computerized-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "astromaster-130eq",
      model: "AstroMaster 130EQ",
      opticalDesign: "Newtonian reflector",
      apertureMm: 130,
      nativeFocalLengthMm: 650,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/astromaster-130eq-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "powerseeker-127eq",
      model: "PowerSeeker 127EQ",
      opticalDesign: "Bird-Jones Newtonian reflector",
      apertureMm: 127,
      nativeFocalLengthMm: 1000,
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/powerseeker-127eq-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "omni-xlt-150",
      model: "Omni XLT 150",
      opticalDesign: "Newtonian reflector",
      apertureMm: 150,
      nativeFocalLengthMm: 750,
      active: true,
      sourceUrl: "https://www.celestron.com/products/omni-xlt-150-telescope",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "nexstar-evolution-6",
      model: "NexStar Evolution 6",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 150,
      nativeFocalLengthMm: 1500,
      active: true,
      sourceUrl: "https://www.celestron.com/products/nexstar-evolution-6",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "nexstar-evolution-8",
      model: "NexStar Evolution 8",
      opticalDesign: "Schmidt-Cassegrain",
      apertureMm: 203,
      nativeFocalLengthMm: 2032,
      active: true,
      sourceUrl: "https://www.celestron.com/products/nexstar-evolution-8",
      verifiedAt: "2026-08-02",
    },
  ],
  cameras: [
    {
      manufacturerSlug: "zwo",
      slug: "asi2600mc-pro",
      model: "ASI2600MC Pro",
      sensorName: "Sony IMX571",
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      resolutionWidthPx: 6248,
      resolutionHeightPx: 4176,
      sensorType: "CMOS",
      colourMode: "colour",
      active: true,
      sourceUrl:
        "https://i.zwoastro.com/zwo-website/manuals/ZWO_ASI2600_Manual_EN.pdf",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "zwo",
      slug: "asi533mc-pro",
      model: "ASI533MC Pro",
      sensorName: "Sony IMX533",
      sensorWidthMm: 11.31,
      sensorHeightMm: 11.31,
      pixelSizeUm: 3.76,
      resolutionWidthPx: 3008,
      resolutionHeightPx: 3008,
      sensorType: "CMOS",
      colourMode: "colour",
      active: true,
      sourceUrl:
        "https://i.zwoastro.com/zwo-website/manuals/ASI533_Manual_EN_V1.2.pdf",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "zwo",
      slug: "asi1600mm-pro",
      model: "ASI1600MM Pro",
      sensorName: "Panasonic MN34230ALJ",
      sensorWidthMm: 17.6,
      sensorHeightMm: 13.3,
      pixelSizeUm: 3.8,
      resolutionWidthPx: 4656,
      resolutionHeightPx: 3520,
      sensorType: "CMOS",
      colourMode: "monochrome",
      active: true,
      sourceUrl:
        "https://i.zwoastro.com/zwo-website/manuals/ASI1600_Manual_EN_V1.5.pdf",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
  ],
  opticalModifiers: [
    {
      manufacturerSlug: "celestron",
      slug: "reducer-lens-0-7x-edgehd-800",
      model: "Reducer Lens 0.7x – EdgeHD 800",
      modifierType: "reducer",
      multiplier: 0.7,
      compatibleNotes: "Compatible only with the EdgeHD 800.",
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/reducer-lens-7x-edgehd-800/1000",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "celestron",
      slug: "reducer-lens-0-7x-edgehd-1100",
      model: "Reducer Lens 0.7x – EdgeHD 1100",
      modifierType: "reducer",
      multiplier: 0.7,
      compatibleNotes: "Compatible with the EdgeHD 11-inch optical tube.",
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/reducer-lens-7x-edgehd-1100",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "celestron",
      slug: "fastar-hyperstar-f-2-edgehd-1100",
      model: "Fastar/HyperStar f/2 configuration – EdgeHD 1100",
      modifierType: "reducer",
      multiplier: 0.2,
      compatibleNotes:
        "Use with a Fastar-compatible EdgeHD 11 front-cell lens. The HyperStar/accessory lens is third-party; use this configuration instead of, not together with, the rear-cell 0.7x reducer.",
      active: true,
      sourceUrl: "https://www.celestron.com/pages/fastar-technology",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "reducer-corrector-0-85x-evostar-80",
      model: "Reducer/Corrector 0.85x for Evostar 80",
      modifierType: "reducer",
      multiplier: 0.85,
      compatibleNotes: "Compatible with the Evostar 80.",
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/reducer-corrector-85x-for-evostar-80",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      manufacturerSlug: "celestron",
      slug: "reducer-corrector-0-63x-sct",
      model: "Reducer - Corrector",
      modifierType: "reducer-corrector",
      multiplier: 0.63,
      compatibleNotes:
        "Compatible with Celestron C5, C6, C8, C9.25, C11 and C14 Schmidt-Cassegrain optical tubes; not compatible with EdgeHD tubes.",
      active: true,
      sourceUrl: "https://www.celestron.com/products/reducer-corrector",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "omni-2x-barlow-1-25",
      model: "Omni 2x Barlow Lens - 1.25 inch",
      modifierType: "Barlow lens",
      multiplier: 2,
      compatibleNotes:
        "For 1.25-inch eyepieces and focusers/diagonals; doubles visual magnification.",
      active: true,
      sourceUrl: "https://www.celestron.com/products/omni-2x-barlow-lens-125in",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "celestron",
      slug: "x-cel-lx-3x-barlow-1-25",
      model: "X-Cel LX 3x Barlow Lens - 1.25 inch",
      modifierType: "Barlow lens",
      multiplier: 3,
      compatibleNotes: "For 1.25-inch eyepieces; triples visual magnification.",
      active: true,
      sourceUrl:
        "https://www.celestron.com/products/x-cel-lx-3x-barlow-lens-125in",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "reducer-corrector-0-85x-evostar-100",
      model: "Reducer/Corrector 0.85x for Evostar 100",
      modifierType: "reducer-corrector",
      multiplier: 0.85,
      compatibleNotes: "Optimized for the Sky-Watcher Evostar 100 ED APO.",
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/collections/refractor-factor-promo-2023/products/reducer-corrector-85x-for-evostar-100",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "quattro-coma-corrector",
      model: "Quattro Coma Corrector",
      modifierType: "coma corrector",
      multiplier: 1,
      compatibleNotes:
        "Corrects coma for compatible Sky-Watcher Quattro Newtonians without changing focal length.",
      active: true,
      sourceUrl:
        "https://www.skywatcherusa.com/products/sky-watcher-quattro-coma-corrector",
      verifiedAt: "2026-08-02",
    },
    {
      manufacturerSlug: "sky-watcher",
      slug: "evostar-100edx-flattener-0-92x",
      model: "Esprit 70EDX / Evostar 100EDX Flattener",
      modifierType: "field flattener-reducer",
      multiplier: 0.92,
      compatibleNotes:
        "For the Evostar 100EDX and Esprit 70EDX; source lists 0.92x reduction for the Evostar 100EDX configuration.",
      active: true,
      sourceUrl: "https://www.skywatcherusa.com/products/evostar-100edx",
      verifiedAt: "2026-08-02",
    },
  ],
  astronomicalTargets: [
    {
      slug: "moon",
      catalogueName: "Moon",
      commonName: "Moon",
      category: "natural-satellite",
      angularWidthDeg: 0.5,
      angularHeightDeg: 0.5,
      defaultRotationDeg: 0,
      assetPath: "/targets/moon.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote: null,
      sourceUrl:
        "https://science.nasa.gov/mission/hubble/multimedia/hubble-glossary/",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      slug: "sun",
      catalogueName: "Sun",
      commonName: "Sun",
      category: "star",
      angularWidthDeg: 0.5,
      angularHeightDeg: 0.5,
      defaultRotationDeg: 0,
      assetPath: "/targets/sun.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote: null,
      sourceUrl:
        "https://science.nasa.gov/mission/hubble/multimedia/hubble-glossary/",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      slug: "m31-andromeda-galaxy",
      catalogueName: "M31",
      commonName: "Andromeda Galaxy",
      category: "galaxy",
      angularWidthDeg: 3.3255,
      angularHeightDeg: 1.179833,
      defaultRotationDeg: 35,
      assetPath: "/targets/andromeda-galaxy.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote: null,
      sourceUrl:
        "https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Messier+31",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      slug: "m42-orion-nebula",
      catalogueName: "M42",
      commonName: "Orion Nebula",
      category: "emission-nebula",
      angularWidthDeg: 1.1,
      angularHeightDeg: 1.1,
      defaultRotationDeg: 90,
      assetPath: "/targets/orion-nebula.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote: null,
      sourceUrl: "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M42",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      slug: "m45-pleiades",
      catalogueName: "M45",
      commonName: "Pleiades",
      category: "open-cluster",
      angularWidthDeg: 1.281,
      angularHeightDeg: 1.281,
      defaultRotationDeg: 0,
      assetPath: "/targets/pleiades.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote: null,
      sourceUrl:
        "https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Pleiades",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
    {
      slug: "ngc-2237-rosette-nebula",
      catalogueName: "NGC 2237",
      commonName: "Rosette Nebula",
      category: "emission-nebula",
      angularWidthDeg: 2.1,
      angularHeightDeg: 1.916667,
      defaultRotationDeg: 90,
      assetPath: "/targets/rosette-nebula.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote:
        "Planning proxy based on the cited 126 × 115 arcminute north-up, east-left image frame; not a calibrated boundary of the nebula.",
      sourceUrl: "https://www.ing.iac.es/PR/press/rosette.html",
      verifiedAt: CATALOGUE_VERIFICATION_DATE,
    },
  ],
});
