import type {
  AstronomicalTargetDto,
  AstronomicalTargetRecord,
  CameraDto,
  CameraRecord,
  CatalogueRepository,
  CatalogueService,
  DecimalValue,
  OpticalModifierDto,
  OpticalModifierRecord,
  PaginatedResult,
  TelescopeDto,
  TelescopeRecord,
} from "./catalogue-types";

function serializeDecimal(value: DecimalValue): string {
  return value.toString();
}

function serializeTelescope(record: TelescopeRecord): TelescopeDto {
  return {
    id: record.id,
    slug: record.slug,
    manufacturer: record.manufacturer,
    model: record.model,
    opticalDesign: record.opticalDesign,
    apertureMm: serializeDecimal(record.apertureMm),
    nativeFocalLengthMm: serializeDecimal(record.nativeFocalLengthMm),
    active: record.active,
    sourceUrl: record.sourceUrl,
    verifiedAt: record.verifiedAt.toISOString(),
  };
}

function serializeCamera(record: CameraRecord): CameraDto {
  return {
    id: record.id,
    slug: record.slug,
    manufacturer: record.manufacturer,
    model: record.model,
    sensorName: record.sensorName,
    sensorWidthMm: serializeDecimal(record.sensorWidthMm),
    sensorHeightMm: serializeDecimal(record.sensorHeightMm),
    pixelSizeUm: serializeDecimal(record.pixelSizeUm),
    resolutionWidthPx: record.resolutionWidthPx,
    resolutionHeightPx: record.resolutionHeightPx,
    sensorType: record.sensorType,
    colourMode: record.colourMode,
    active: record.active,
    sourceUrl: record.sourceUrl,
    verifiedAt: record.verifiedAt.toISOString(),
  };
}

function serializeOpticalModifier(
  record: OpticalModifierRecord,
): OpticalModifierDto {
  return {
    id: record.id,
    slug: record.slug,
    manufacturer: record.manufacturer,
    model: record.model,
    modifierType: record.modifierType,
    multiplier: serializeDecimal(record.multiplier),
    compatibleNotes: record.compatibleNotes,
    active: record.active,
    sourceUrl: record.sourceUrl,
    verifiedAt: record.verifiedAt.toISOString(),
  };
}

function serializeTarget(
  record: AstronomicalTargetRecord,
): AstronomicalTargetDto {
  return {
    id: record.id,
    slug: record.slug,
    catalogueName: record.catalogueName,
    commonName: record.commonName,
    category: record.category,
    angularWidthDeg: serializeDecimal(record.angularWidthDeg),
    angularHeightDeg: serializeDecimal(record.angularHeightDeg),
    defaultRotationDeg: serializeDecimal(record.defaultRotationDeg),
    assetPath: record.assetPath,
    assetCredit: record.assetCredit,
    assetLicenseUrl: record.assetLicenseUrl,
    framingNote: record.framingNote,
    sourceUrl: record.sourceUrl,
    verifiedAt: record.verifiedAt.toISOString(),
  };
}

function serializePage<TRecord, TDto>(
  page: { items: TRecord[]; total: number },
  query: { page: number; pageSize: number },
  serialize: (record: TRecord) => TDto,
): PaginatedResult<TDto> {
  return {
    items: page.items.map(serialize),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: page.total,
      totalPages: Math.ceil(page.total / query.pageSize),
    },
  };
}

export function createCatalogueService(
  repository: CatalogueRepository,
): CatalogueService {
  return {
    async listTelescopes(query) {
      return serializePage(
        await repository.listTelescopes(query),
        query,
        serializeTelescope,
      );
    },
    async getTelescope(slug) {
      const record = await repository.findTelescopeBySlug(slug);
      return record ? serializeTelescope(record) : null;
    },
    async listCameras(query) {
      return serializePage(
        await repository.listCameras(query),
        query,
        serializeCamera,
      );
    },
    async getCamera(slug) {
      const record = await repository.findCameraBySlug(slug);
      return record ? serializeCamera(record) : null;
    },
    async listOpticalModifiers(query) {
      return serializePage(
        await repository.listOpticalModifiers(query),
        query,
        serializeOpticalModifier,
      );
    },
    async getOpticalModifier(slug) {
      const record = await repository.findOpticalModifierBySlug(slug);
      return record ? serializeOpticalModifier(record) : null;
    },
    async listTargets(query) {
      return serializePage(
        await repository.listTargets(query),
        query,
        serializeTarget,
      );
    },
  };
}
