import { MAX_CATALOGUE_PAGE_SIZE } from "../schemas/catalogue-query";
import { getCatalogueService } from "./catalogue";
import type {
  AstronomicalTargetDto,
  CameraDto,
  CatalogueService,
  OpticalModifierDto,
  PaginatedResult,
  TelescopeDto,
} from "./catalogue-types";

export const FIELD_OF_VIEW_CATALOGUE_REVALIDATE_SECONDS = 3_600;
export const FIELD_OF_VIEW_CATALOGUE_CACHE_TAG = "field-of-view-catalogue";
export const MAX_FIELD_OF_VIEW_CATALOGUE_PAGES = 100;

export interface FieldOfViewCatalogue {
  readonly status: "ready" | "unavailable";
  readonly telescopes: readonly TelescopeDto[];
  readonly cameras: readonly CameraDto[];
  readonly opticalModifiers: readonly OpticalModifierDto[];
  readonly targets: readonly AstronomicalTargetDto[];
}

type CataloguePageLoader<T> = (
  page: number,
  pageSize: number,
) => Promise<PaginatedResult<T>>;

async function loadEveryPage<T>(
  loadPage: CataloguePageLoader<T>,
): Promise<T[]> {
  const firstPage = await loadPage(1, MAX_CATALOGUE_PAGE_SIZE);
  const totalPages = firstPage.pagination.totalPages;
  if (
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0 ||
    totalPages > MAX_FIELD_OF_VIEW_CATALOGUE_PAGES
  ) {
    throw new Error("Catalogue pagination is outside the supported bounds.");
  }

  const pages = [firstPage];
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await loadPage(page, MAX_CATALOGUE_PAGE_SIZE));
  }

  return pages.flatMap(({ items }) => items);
}

export async function loadFieldOfViewCatalogue(
  service: CatalogueService = getCatalogueService(),
): Promise<FieldOfViewCatalogue> {
  const [telescopes, cameras, opticalModifiers, targets] = await Promise.all([
    loadEveryPage((page, pageSize) =>
      service.listTelescopes({ page, pageSize }),
    ),
    loadEveryPage((page, pageSize) => service.listCameras({ page, pageSize })),
    loadEveryPage((page, pageSize) =>
      service.listOpticalModifiers({ page, pageSize }),
    ),
    loadEveryPage((page, pageSize) => service.listTargets({ page, pageSize })),
  ]);

  if (telescopes.length === 0 || cameras.length === 0 || targets.length === 0) {
    throw new Error("The required calculator catalogue has not been seeded.");
  }

  return {
    status: "ready",
    telescopes,
    cameras,
    opticalModifiers,
    targets,
  };
}

export function unavailableFieldOfViewCatalogue(): FieldOfViewCatalogue {
  return {
    status: "unavailable",
    telescopes: [],
    cameras: [],
    opticalModifiers: [],
    targets: [],
  };
}
