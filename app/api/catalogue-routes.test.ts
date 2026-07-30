import { describe, expect, it, vi } from "vitest";

import type { CatalogueService } from "@/features/field-of-view/services/catalogue-types";

import {
  createCameraHandler,
  createCamerasHandler,
  createOpticalModifiersHandler,
  createTelescopeHandler,
  createTelescopesHandler,
  createTargetsHandler,
} from "./_shared/catalogue-route-factories";

function createService(
  overrides: Partial<CatalogueService> = {},
): CatalogueService {
  return {
    listTelescopes: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    getTelescope: vi.fn().mockResolvedValue(null),
    listCameras: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    getCamera: vi.fn().mockResolvedValue(null),
    listOpticalModifiers: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    getOpticalModifier: vi.fn().mockResolvedValue(null),
    listTargets: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    ...overrides,
  };
}

describe("catalogue API routes", () => {
  it("returns a versioned, cached and paginated telescope list", async () => {
    const listTelescopes = vi.fn().mockResolvedValue({
      items: [{ slug: "redcat-51" }],
      pagination: { page: 2, pageSize: 10, total: 12, totalPages: 2 },
    });
    const service = createService({ listTelescopes });
    const response = await createTelescopesHandler(() => service)(
      new Request(
        "https://astrotools.smeird.com/api/v1/telescopes?page=2&pageSize=10&q=RedCat&manufacturer=william-optics",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    await expect(response.json()).resolves.toEqual({
      apiVersion: "v1",
      data: [{ slug: "redcat-51" }],
      meta: { page: 2, pageSize: 10, total: 12, totalPages: 2 },
    });
    expect(listTelescopes).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      q: "RedCat",
      manufacturer: "william-optics",
    });
  });

  it.each([
    "?page=0",
    "?pageSize=5000",
    `?q=${"a".repeat(101)}`,
    "?page=1&page=2",
    "?unknown=value",
  ])(
    "rejects invalid telescope parameters without calling the service: %s",
    async (query) => {
      const listTelescopes = vi.fn();
      const service = createService({ listTelescopes });
      const response = await createTelescopesHandler(() => service)(
        new Request(`https://astrotools.smeird.com/api/v1/telescopes${query}`),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({
        apiVersion: "v1",
        error: {
          code: "INVALID_REQUEST",
          message: "The request parameters are invalid.",
        },
      });
      expect(listTelescopes).not.toHaveBeenCalled();
    },
  );

  it("does not disclose database errors", async () => {
    const service = createService({
      listTelescopes: vi
        .fn()
        .mockRejectedValue(new Error("SELECT failed for secret schema")),
    });
    const response = await createTelescopesHandler(() => service)(
      new Request("https://astrotools.smeird.com/api/v1/telescopes"),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).not.toContain("SELECT");
    expect(body).not.toContain("secret schema");
    expect(JSON.parse(body)).toEqual({
      apiVersion: "v1",
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed.",
      },
    });
  });

  it("returns an inactive telescope detail so old links stay resolvable", async () => {
    const getTelescope = vi.fn().mockResolvedValue({
      slug: "retired-scope",
      active: false,
    });
    const service = createService({ getTelescope });
    const response = await createTelescopeHandler(() => service)(
      new Request(
        "https://astrotools.smeird.com/api/v1/telescopes/retired-scope",
      ),
      { params: Promise.resolve({ slug: "retired-scope" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      apiVersion: "v1",
      data: { slug: "retired-scope", active: false },
    });
    expect(getTelescope).toHaveBeenCalledWith("retired-scope");
  });

  it("accepts a detail slug at the database boundary length", async () => {
    const slug = "a".repeat(191);
    const getTelescope = vi.fn().mockResolvedValue({ slug, active: true });
    const response = await createTelescopeHandler(() =>
      createService({ getTelescope }),
    )(new Request(`https://astrotools.smeird.com/api/v1/telescopes/${slug}`), {
      params: Promise.resolve({ slug }),
    });

    expect(response.status).toBe(200);
    expect(getTelescope).toHaveBeenCalledWith(slug);
  });

  it("returns an inactive camera detail so old links stay resolvable", async () => {
    const getCamera = vi.fn().mockResolvedValue({
      slug: "retired-camera",
      active: false,
    });
    const service = createService({ getCamera });
    const response = await createCameraHandler(() => service)(
      new Request(
        "https://astrotools.smeird.com/api/v1/cameras/retired-camera",
      ),
      { params: Promise.resolve({ slug: "retired-camera" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      apiVersion: "v1",
      data: { slug: "retired-camera", active: false },
    });
    expect(getCamera).toHaveBeenCalledWith("retired-camera");
  });

  it("returns safe errors for invalid and missing detail slugs", async () => {
    const service = createService();
    const handler = createCameraHandler(() => service);
    const request = new Request(
      "https://astrotools.smeird.com/api/v1/cameras/missing-camera",
    );

    const invalid = await handler(request, {
      params: Promise.resolve({ slug: "NOT VALID" }),
    });
    const missing = await handler(request, {
      params: Promise.resolve({ slug: "missing-camera" }),
    });

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "CATALOGUE_ITEM_NOT_FOUND" },
    });
  });

  it("rejects query parameters on cached detail routes", async () => {
    const getTelescope = vi.fn();
    const service = createService({ getTelescope });
    const handler = createTelescopeHandler(() => service);

    for (const query of ["?unexpected=value", "?x=1&x=2"]) {
      const response = await handler(
        new Request(
          `https://astrotools.smeird.com/api/v1/telescopes/cat-51-wifd${query}`,
        ),
        { params: Promise.resolve({ slug: "cat-51-wifd" }) },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }

    expect(getTelescope).not.toHaveBeenCalled();
  });

  it("wires every list route to its matching service operation", async () => {
    const service = createService();
    const request = new Request("https://astrotools.smeird.com/api/v1/items");

    await createCamerasHandler(() => service)(request);
    await createOpticalModifiersHandler(() => service)(request);
    await createTargetsHandler(() => service)(request);

    expect(service.listCameras).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
    expect(service.listOpticalModifiers).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
    expect(service.listTargets).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });
});
