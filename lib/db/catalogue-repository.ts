import type { PrismaClient } from "@/lib/db/generated/prisma/client";
import type {
  CatalogueListQuery,
  EquipmentListQuery,
} from "@/features/field-of-view/schemas/catalogue-query";
import type { CatalogueRepository } from "@/features/field-of-view/services/catalogue-types";

const manufacturerSelect = {
  slug: true,
  name: true,
} as const;

const telescopeSelect = {
  id: true,
  slug: true,
  manufacturer: { select: manufacturerSelect },
  model: true,
  opticalDesign: true,
  apertureMm: true,
  nativeFocalLengthMm: true,
  active: true,
  sourceUrl: true,
  verifiedAt: true,
} as const;

const cameraSelect = {
  id: true,
  slug: true,
  manufacturer: { select: manufacturerSelect },
  model: true,
  sensorName: true,
  sensorWidthMm: true,
  sensorHeightMm: true,
  pixelSizeUm: true,
  resolutionWidthPx: true,
  resolutionHeightPx: true,
  sensorType: true,
  colourMode: true,
  active: true,
  sourceUrl: true,
  verifiedAt: true,
} as const;

const opticalModifierSelect = {
  id: true,
  slug: true,
  manufacturer: { select: manufacturerSelect },
  model: true,
  modifierType: true,
  multiplier: true,
  compatibleNotes: true,
  active: true,
  sourceUrl: true,
  verifiedAt: true,
} as const;

const targetSelect = {
  id: true,
  slug: true,
  catalogueName: true,
  commonName: true,
  category: true,
  angularWidthDeg: true,
  angularHeightDeg: true,
  defaultRotationDeg: true,
  assetPath: true,
  assetCredit: true,
  assetLicenseUrl: true,
  framingNote: true,
  sourceUrl: true,
  verifiedAt: true,
} as const;

function pagination(query: { page: number; pageSize: number }) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function equipmentWhere(query: EquipmentListQuery) {
  const search = query.q ? escapeLikePattern(query.q) : undefined;

  return {
    active: true,
    ...(query.manufacturer
      ? { manufacturer: { slug: query.manufacturer } }
      : {}),
    ...(search
      ? {
          OR: [
            { model: { contains: search } },
            { manufacturer: { name: { contains: search } } },
          ],
        }
      : {}),
  };
}

function targetWhere(query: CatalogueListQuery) {
  const search = query.q ? escapeLikePattern(query.q) : undefined;

  return {
    ...(search
      ? {
          OR: [
            { commonName: { contains: search } },
            { catalogueName: { contains: search } },
          ],
        }
      : {}),
  };
}

export function createPrismaCatalogueRepository(
  prisma: PrismaClient,
): CatalogueRepository {
  return {
    async listTelescopes(query) {
      const where = equipmentWhere(query);
      const [items, total] = await Promise.all([
        prisma.telescope.findMany({
          where,
          select: telescopeSelect,
          ...pagination(query),
          orderBy: [
            { manufacturer: { name: "asc" } },
            { model: "asc" },
            { slug: "asc" },
          ],
        }),
        prisma.telescope.count({ where }),
      ]);

      return { items, total };
    },
    async findTelescopeBySlug(slug) {
      return prisma.telescope.findUnique({
        where: { slug },
        select: telescopeSelect,
      });
    },
    async listCameras(query) {
      const where = equipmentWhere(query);
      const [items, total] = await Promise.all([
        prisma.camera.findMany({
          where,
          select: cameraSelect,
          ...pagination(query),
          orderBy: [
            { manufacturer: { name: "asc" } },
            { model: "asc" },
            { slug: "asc" },
          ],
        }),
        prisma.camera.count({ where }),
      ]);

      return { items, total };
    },
    async findCameraBySlug(slug) {
      return prisma.camera.findUnique({
        where: { slug },
        select: cameraSelect,
      });
    },
    async listOpticalModifiers(query) {
      const where = equipmentWhere(query);
      const [items, total] = await Promise.all([
        prisma.opticalModifier.findMany({
          where,
          select: opticalModifierSelect,
          ...pagination(query),
          orderBy: [
            { manufacturer: { name: "asc" } },
            { model: "asc" },
            { slug: "asc" },
          ],
        }),
        prisma.opticalModifier.count({ where }),
      ]);

      return { items, total };
    },
    async listTargets(query) {
      const where = targetWhere(query);
      const [items, total] = await Promise.all([
        prisma.astronomicalTarget.findMany({
          where,
          select: targetSelect,
          ...pagination(query),
          orderBy: [{ commonName: "asc" }, { slug: "asc" }],
        }),
        prisma.astronomicalTarget.count({ where }),
      ]);

      return { items, total };
    },
  };
}
