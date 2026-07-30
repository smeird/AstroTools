import type {
  CatalogueListQuery,
  EquipmentListQuery,
} from "../schemas/catalogue-query";

export type DecimalValue = string | number | { toString(): string };

export interface ManufacturerRecord {
  slug: string;
  name: string;
}

interface ProvenancedRecord {
  id: string;
  slug: string;
  sourceUrl: string;
  verifiedAt: Date;
}

interface ActiveProvenancedRecord extends ProvenancedRecord {
  active: boolean;
}

export interface TelescopeRecord extends ActiveProvenancedRecord {
  manufacturer: ManufacturerRecord;
  model: string;
  opticalDesign: string;
  apertureMm: DecimalValue;
  nativeFocalLengthMm: DecimalValue;
}

export interface CameraRecord extends ActiveProvenancedRecord {
  manufacturer: ManufacturerRecord;
  model: string;
  sensorName: string;
  sensorWidthMm: DecimalValue;
  sensorHeightMm: DecimalValue;
  pixelSizeUm: DecimalValue;
  resolutionWidthPx: number;
  resolutionHeightPx: number;
  sensorType: string;
  colourMode: string;
}

export interface OpticalModifierRecord extends ActiveProvenancedRecord {
  manufacturer: ManufacturerRecord;
  model: string;
  modifierType: string;
  multiplier: DecimalValue;
  compatibleNotes: string | null;
}

export interface AstronomicalTargetRecord extends ProvenancedRecord {
  catalogueName: string;
  commonName: string;
  category: string;
  angularWidthDeg: DecimalValue;
  angularHeightDeg: DecimalValue;
  defaultRotationDeg: DecimalValue;
  assetPath: string | null;
  assetCredit: string | null;
  assetLicenseUrl: string | null;
  framingNote: string | null;
}

export interface RepositoryPage<T> {
  items: T[];
  total: number;
}

export interface CatalogueRepository {
  listTelescopes(
    query: EquipmentListQuery,
  ): Promise<RepositoryPage<TelescopeRecord>>;
  findTelescopeBySlug(slug: string): Promise<TelescopeRecord | null>;
  listCameras(query: EquipmentListQuery): Promise<RepositoryPage<CameraRecord>>;
  findCameraBySlug(slug: string): Promise<CameraRecord | null>;
  listOpticalModifiers(
    query: EquipmentListQuery,
  ): Promise<RepositoryPage<OpticalModifierRecord>>;
  listTargets(
    query: CatalogueListQuery,
  ): Promise<RepositoryPage<AstronomicalTargetRecord>>;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface ManufacturerDto {
  slug: string;
  name: string;
}

export interface TelescopeDto {
  id: string;
  slug: string;
  manufacturer: ManufacturerDto;
  model: string;
  opticalDesign: string;
  apertureMm: string;
  nativeFocalLengthMm: string;
  active: boolean;
  sourceUrl: string;
  verifiedAt: string;
}

export interface CameraDto {
  id: string;
  slug: string;
  manufacturer: ManufacturerDto;
  model: string;
  sensorName: string;
  sensorWidthMm: string;
  sensorHeightMm: string;
  pixelSizeUm: string;
  resolutionWidthPx: number;
  resolutionHeightPx: number;
  sensorType: string;
  colourMode: string;
  active: boolean;
  sourceUrl: string;
  verifiedAt: string;
}

export interface OpticalModifierDto {
  id: string;
  slug: string;
  manufacturer: ManufacturerDto;
  model: string;
  modifierType: string;
  multiplier: string;
  compatibleNotes: string | null;
  active: boolean;
  sourceUrl: string;
  verifiedAt: string;
}

export interface AstronomicalTargetDto {
  id: string;
  slug: string;
  catalogueName: string;
  commonName: string;
  category: string;
  angularWidthDeg: string;
  angularHeightDeg: string;
  defaultRotationDeg: string;
  assetPath: string | null;
  assetCredit: string | null;
  assetLicenseUrl: string | null;
  framingNote: string | null;
  sourceUrl: string;
  verifiedAt: string;
}

export interface CatalogueService {
  listTelescopes(
    query: EquipmentListQuery,
  ): Promise<PaginatedResult<TelescopeDto>>;
  getTelescope(slug: string): Promise<TelescopeDto | null>;
  listCameras(query: EquipmentListQuery): Promise<PaginatedResult<CameraDto>>;
  getCamera(slug: string): Promise<CameraDto | null>;
  listOpticalModifiers(
    query: EquipmentListQuery,
  ): Promise<PaginatedResult<OpticalModifierDto>>;
  listTargets(
    query: CatalogueListQuery,
  ): Promise<PaginatedResult<AstronomicalTargetDto>>;
}
