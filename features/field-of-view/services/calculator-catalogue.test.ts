import { describe, expect, it, vi } from "vitest";

import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import type {
  AstronomicalTargetDto,
  CameraDto,
  CatalogueService,
  OpticalModifierDto,
  PaginatedResult,
  TelescopeDto,
} from "./catalogue-types";
import {
  MAX_FIELD_OF_VIEW_CATALOGUE_PAGES,
  loadFieldOfViewCatalogue,
  supplementFieldOfViewCatalogue,
  unavailableFieldOfViewCatalogue,
} from "./calculator-catalogue";

function emptyPage<T>(): PaginatedResult<T> {
  return {
    items: [],
    pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
  };
}

function singlePage<T>(item: T): PaginatedResult<T> {
  return {
    items: [item],
    pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
  };
}

function telescope(slug: string): TelescopeDto {
  return {
    id: slug,
    slug,
    manufacturer: { slug: "maker", name: "Maker" },
    model: slug,
    opticalDesign: "Refractor",
    apertureMm: "80",
    nativeFocalLengthMm: "600",
    active: true,
    sourceUrl: "https://example.com/telescope",
    verifiedAt: "2026-07-30T00:00:00.000Z",
  };
}

function serviceWith(
  overrides: Partial<CatalogueService> = {},
): CatalogueService {
  return {
    listTelescopes: vi.fn(async () => singlePage(telescope("default-scope"))),
    getTelescope: vi.fn(async () => null),
    listCameras: vi.fn(async () =>
      singlePage(fieldOfViewCatalogueFixture.cameras[0]!),
    ),
    getCamera: vi.fn(async () => null),
    listOpticalModifiers: vi.fn(async () => emptyPage<OpticalModifierDto>()),
    getOpticalModifier: vi.fn(async () => null),
    listTargets: vi.fn(async () =>
      singlePage(fieldOfViewCatalogueFixture.targets[0]!),
    ),
    ...overrides,
  };
}

describe("loadFieldOfViewCatalogue", () => {
  it("loads every bounded service page without importing seed data", async () => {
    const listTelescopes = vi.fn(
      async ({ page, pageSize }: { page: number; pageSize: number }) => ({
        items: [telescope(`scope-${page}`)],
        pagination: { page, pageSize, total: 51, totalPages: 2 },
      }),
    );
    const service = serviceWith({ listTelescopes });

    const catalogue = await loadFieldOfViewCatalogue(service);

    expect(catalogue.status).toBe("ready");
    expect(catalogue.telescopes.map(({ slug }) => slug)).toEqual([
      "scope-1",
      "scope-2",
    ]);
    expect(listTelescopes).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 50,
    });
    expect(listTelescopes).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 50,
    });
  });

  it("rejects catalogue failures so the request boundary can avoid caching them", async () => {
    const failure = new Error("database unavailable");
    const service = serviceWith({
      listCameras: vi.fn(async () => Promise.reject(failure)),
    });

    await expect(loadFieldOfViewCatalogue(service)).rejects.toBe(failure);
  });

  it("bounds page traversal before allocating or querying untrusted metadata", async () => {
    const listTelescopes = vi.fn(async () => ({
      items: [telescope("scope-1")],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 50_001,
        totalPages: MAX_FIELD_OF_VIEW_CATALOGUE_PAGES + 1,
      },
    }));

    await expect(
      loadFieldOfViewCatalogue(serviceWith({ listTelescopes })),
    ).rejects.toThrow(/outside the supported bounds/i);
    expect(listTelescopes).toHaveBeenCalledTimes(1);
  });

  it("rejects an unseeded required catalogue instead of caching it as ready", async () => {
    const service = serviceWith({
      listTelescopes: vi.fn(async () => emptyPage<TelescopeDto>()),
      listCameras: vi.fn(async () => emptyPage<CameraDto>()),
      listTargets: vi.fn(async () => emptyPage<AstronomicalTargetDto>()),
    });

    await expect(loadFieldOfViewCatalogue(service)).rejects.toThrow(
      /has not been seeded/i,
    );
  });
});

describe("supplementFieldOfViewCatalogue", () => {
  it("returns an unavailable catalogue without constructing a database service", async () => {
    const unavailable = unavailableFieldOfViewCatalogue();

    await expect(
      supplementFieldOfViewCatalogue(unavailable, {
        telescopeSlug: "retired-telescope",
        cameraSlug: "retired-camera",
        modifierSlugs: ["retired-reducer"],
      }),
    ).resolves.toBe(unavailable);
  });

  it("loads only missing referenced equipment and preserves inactive records", async () => {
    const retiredTelescope = {
      ...fieldOfViewCatalogueFixture.telescopes[0]!,
      slug: "retired-telescope",
      active: false,
    };
    const retiredCamera = {
      ...fieldOfViewCatalogueFixture.cameras[0]!,
      slug: "retired-camera",
      active: false,
    };
    const retiredModifier = {
      ...fieldOfViewCatalogueFixture.opticalModifiers[0]!,
      slug: "retired-reducer",
      active: false,
    };
    const service = serviceWith({
      getTelescope: vi.fn(async () => retiredTelescope),
      getCamera: vi.fn(async () => retiredCamera),
      getOpticalModifier: vi.fn(async () => retiredModifier),
    });

    const catalogue = await supplementFieldOfViewCatalogue(
      fieldOfViewCatalogueFixture,
      {
        telescopeSlug: retiredTelescope.slug,
        cameraSlug: retiredCamera.slug,
        modifierSlugs: [retiredModifier.slug],
      },
      service,
    );

    expect(catalogue.telescopes.at(-1)).toEqual(retiredTelescope);
    expect(catalogue.cameras.at(-1)).toEqual(retiredCamera);
    expect(catalogue.opticalModifiers.at(-1)).toEqual(retiredModifier);
    expect(service.getTelescope).toHaveBeenCalledTimes(1);
    expect(service.getCamera).toHaveBeenCalledTimes(1);
    expect(service.getOpticalModifier).toHaveBeenCalledTimes(1);
  });

  it("does not query references already present in the active catalogue", async () => {
    const service = serviceWith();

    await supplementFieldOfViewCatalogue(
      fieldOfViewCatalogueFixture,
      {
        telescopeSlug: fieldOfViewCatalogueFixture.telescopes[0]!.slug,
        cameraSlug: fieldOfViewCatalogueFixture.cameras[0]!.slug,
        modifierSlugs: [fieldOfViewCatalogueFixture.opticalModifiers[0]!.slug],
      },
      service,
    );

    expect(service.getTelescope).not.toHaveBeenCalled();
    expect(service.getCamera).not.toHaveBeenCalled();
    expect(service.getOpticalModifier).not.toHaveBeenCalled();
  });
});

describe("unavailableFieldOfViewCatalogue", () => {
  it("provides an explicit empty manual-mode state", () => {
    expect(unavailableFieldOfViewCatalogue()).toEqual({
      status: "unavailable",
      telescopes: [],
      cameras: [],
      opticalModifiers: [],
      targets: [],
    });
  });
});
