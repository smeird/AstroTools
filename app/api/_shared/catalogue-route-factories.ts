import {
  catalogueListQuerySchema,
  catalogueSlugSchema,
  equipmentListQuerySchema,
  type CatalogueListQuery,
  type EquipmentListQuery,
} from "@/features/field-of-view/schemas/catalogue-query";
import type {
  AstronomicalTargetDto,
  CameraDto,
  OpticalModifierDto,
  TelescopeDto,
} from "@/features/field-of-view/services/catalogue-types";

import {
  createCatalogueDetailHandler,
  createCatalogueListHandler,
  type CatalogueServiceProvider,
} from "./catalogue-handlers";

export function createTelescopesHandler(getService?: CatalogueServiceProvider) {
  return createCatalogueListHandler<EquipmentListQuery, TelescopeDto>(
    equipmentListQuerySchema,
    (service, query) => service.listTelescopes(query),
    getService,
  );
}

export function createTelescopeHandler(getService?: CatalogueServiceProvider) {
  return createCatalogueDetailHandler<TelescopeDto>(
    catalogueSlugSchema,
    (service, slug) => service.getTelescope(slug),
    getService,
  );
}

export function createCamerasHandler(getService?: CatalogueServiceProvider) {
  return createCatalogueListHandler<EquipmentListQuery, CameraDto>(
    equipmentListQuerySchema,
    (service, query) => service.listCameras(query),
    getService,
  );
}

export function createCameraHandler(getService?: CatalogueServiceProvider) {
  return createCatalogueDetailHandler<CameraDto>(
    catalogueSlugSchema,
    (service, slug) => service.getCamera(slug),
    getService,
  );
}

export function createOpticalModifiersHandler(
  getService?: CatalogueServiceProvider,
) {
  return createCatalogueListHandler<EquipmentListQuery, OpticalModifierDto>(
    equipmentListQuerySchema,
    (service, query) => service.listOpticalModifiers(query),
    getService,
  );
}

export function createTargetsHandler(getService?: CatalogueServiceProvider) {
  return createCatalogueListHandler<CatalogueListQuery, AstronomicalTargetDto>(
    catalogueListQuerySchema,
    (service, query) => service.listTargets(query),
    getService,
  );
}
