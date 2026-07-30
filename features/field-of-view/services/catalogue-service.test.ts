import { describe, expect, it, vi } from "vitest";

import { createCatalogueService } from "./catalogue-service";
import type {
  AstronomicalTargetRecord,
  CameraRecord,
  CatalogueRepository,
  TelescopeRecord,
} from "./catalogue-types";

const verifiedAt = new Date("2026-07-01T12:00:00.000Z");

function createRepository(
  overrides: Partial<CatalogueRepository> = {},
): CatalogueRepository {
  return {
    listTelescopes: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findTelescopeBySlug: vi.fn().mockResolvedValue(null),
    listCameras: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findCameraBySlug: vi.fn().mockResolvedValue(null),
    listOpticalModifiers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listTargets: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    ...overrides,
  };
}

describe("catalogue service", () => {
  it("serializes Decimal-like values, dates and pagination metadata", async () => {
    const camera: CameraRecord = {
      id: "camera-id",
      slug: "asi2600mc-pro",
      manufacturer: { slug: "zwo", name: "ZWO" },
      model: "ASI2600MC Pro",
      sensorName: "Sony IMX571",
      sensorWidthMm: { toString: () => "23.5" },
      sensorHeightMm: { toString: () => "15.7" },
      pixelSizeUm: { toString: () => "3.76" },
      resolutionWidthPx: 6248,
      resolutionHeightPx: 4176,
      sensorType: "CMOS",
      colourMode: "COLOUR",
      active: true,
      sourceUrl: "https://example.test/camera",
      verifiedAt,
    };
    const repository = createRepository({
      listCameras: vi.fn().mockResolvedValue({ items: [camera], total: 21 }),
    });

    await expect(
      createCatalogueService(repository).listCameras({
        page: 2,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: [
        {
          ...camera,
          sensorWidthMm: "23.5",
          sensorHeightMm: "15.7",
          pixelSizeUm: "3.76",
          verifiedAt: "2026-07-01T12:00:00.000Z",
        },
      ],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      },
    });
  });

  it("preserves inactive detail records for old shared configurations", async () => {
    const telescope: TelescopeRecord = {
      id: "telescope-id",
      slug: "retired-scope",
      manufacturer: { slug: "example", name: "Example" },
      model: "Retired Scope",
      opticalDesign: "REFRACTOR",
      apertureMm: "80.0",
      nativeFocalLengthMm: "480.0",
      active: false,
      sourceUrl: "https://example.test/telescope",
      verifiedAt,
    };
    const repository = createRepository({
      findTelescopeBySlug: vi.fn().mockResolvedValue(telescope),
    });

    await expect(
      createCatalogueService(repository).getTelescope("retired-scope"),
    ).resolves.toMatchObject({
      slug: "retired-scope",
      active: false,
      apertureMm: "80.0",
    });
  });

  it("serializes target framing qualifications without changing their wording", async () => {
    const target: AstronomicalTargetRecord = {
      id: "target-id",
      slug: "ngc-2237-rosette-nebula",
      catalogueName: "NGC 2237",
      commonName: "Rosette Nebula",
      category: "emission-nebula",
      angularWidthDeg: { toString: () => "2.1" },
      angularHeightDeg: { toString: () => "1.916667" },
      defaultRotationDeg: { toString: () => "90" },
      assetPath: "/targets/rosette-nebula.svg",
      assetCredit: "Astrotools target illustration, CC BY 4.0",
      assetLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      framingNote:
        "Planning proxy based on the cited image frame; not a calibrated boundary.",
      sourceUrl: "https://example.test/rosette",
      verifiedAt,
    };
    const repository = createRepository({
      listTargets: vi.fn().mockResolvedValue({ items: [target], total: 1 }),
    });

    await expect(
      createCatalogueService(repository).listTargets({
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toMatchObject({
      items: [
        {
          slug: "ngc-2237-rosette-nebula",
          framingNote:
            "Planning proxy based on the cited image frame; not a calibrated boundary.",
        },
      ],
    });
  });

  it("returns null when a detail record does not exist", async () => {
    const repository = createRepository();

    await expect(
      createCatalogueService(repository).getCamera("missing-camera"),
    ).resolves.toBeNull();
  });
});
