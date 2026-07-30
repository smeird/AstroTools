import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/lib/db/generated/prisma/client";

import { createPrismaCatalogueRepository } from "./catalogue-repository";

describe("Prisma catalogue repository", () => {
  it("bounds and filters telescope list queries to active records", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      telescope: { findMany, count, findUnique: vi.fn() },
    } as unknown as PrismaClient;
    const repository = createPrismaCatalogueRepository(prisma);

    await repository.listTelescopes({
      page: 2,
      pageSize: 10,
      q: "RedCat",
      manufacturer: "william-optics",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          active: true,
          manufacturer: { slug: "william-optics" },
          OR: [
            { model: { contains: "RedCat" } },
            { manufacturer: { name: { contains: "RedCat" } } },
          ],
        },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: {
        active: true,
        manufacturer: { slug: "william-optics" },
        OR: [
          { model: { contains: "RedCat" } },
          { manufacturer: { name: { contains: "RedCat" } } },
        ],
      },
    });
  });

  it("does not filter detail lookup by active status", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "retired-scope",
      active: false,
    });
    const prisma = {
      telescope: { findMany: vi.fn(), count: vi.fn(), findUnique },
    } as unknown as PrismaClient;
    const repository = createPrismaCatalogueRepository(prisma);

    await expect(
      repository.findTelescopeBySlug("retired-scope"),
    ).resolves.toMatchObject({ active: false });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "retired-scope" } }),
    );
  });

  it("does not filter optical-modifier detail lookup by active status", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      slug: "retired-reducer",
      active: false,
    });
    const prisma = {
      opticalModifier: { findMany: vi.fn(), count: vi.fn(), findUnique },
    } as unknown as PrismaClient;
    const repository = createPrismaCatalogueRepository(prisma);

    await expect(
      repository.findOpticalModifierBySlug("retired-reducer"),
    ).resolves.toMatchObject({ active: false });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "retired-reducer" } }),
    );
  });

  it("searches targets and applies stable ordering", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      astronomicalTarget: { findMany, count },
    } as unknown as PrismaClient;
    const repository = createPrismaCatalogueRepository(prisma);

    await repository.listTargets({ page: 1, pageSize: 20, q: "Andromeda" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { commonName: { contains: "Andromeda" } },
            { catalogueName: { contains: "Andromeda" } },
          ],
        },
        orderBy: [{ commonName: "asc" }, { slug: "asc" }],
      }),
    );
  });

  it("treats MySQL LIKE wildcard characters as literal search text", async () => {
    const telescopeFindMany = vi.fn().mockResolvedValue([]);
    const telescopeCount = vi.fn().mockResolvedValue(0);
    const targetFindMany = vi.fn().mockResolvedValue([]);
    const targetCount = vi.fn().mockResolvedValue(0);
    const prisma = {
      telescope: {
        findMany: telescopeFindMany,
        count: telescopeCount,
        findUnique: vi.fn(),
      },
      astronomicalTarget: {
        findMany: targetFindMany,
        count: targetCount,
      },
    } as unknown as PrismaClient;
    const repository = createPrismaCatalogueRepository(prisma);

    await repository.listTelescopes({ page: 1, pageSize: 20, q: "%_\\" });
    await repository.listTargets({ page: 1, pageSize: 20, q: "%_\\" });

    expect(telescopeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { model: { contains: "\\%\\_\\\\" } },
            { manufacturer: { name: { contains: "\\%\\_\\\\" } } },
          ],
        }),
      }),
    );
    expect(targetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { commonName: { contains: "\\%\\_\\\\" } },
            { catalogueName: { contains: "\\%\\_\\\\" } },
          ],
        },
      }),
    );
  });
});
