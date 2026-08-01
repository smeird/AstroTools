import type {
  CameraConfiguration,
  EquipmentConfigurationState,
  TelescopeConfiguration,
} from "@/features/field-of-view/model/equipment-configuration";
import {
  cameraIsCustomised,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
  telescopeIsCustomised,
} from "@/features/field-of-view/model/equipment-configuration";
import { resolveSensorDimensions } from "@/lib/calculations";

export const SHARED_TELESCOPE_SELECTION_KEY =
  "astrotools.shared.telescope-selection.v1";
export const SHARED_CAMERA_SELECTION_KEY =
  "astrotools.shared.camera-selection.v1";
export const SHARED_IMAGING_TRAIN_KEY = "astrotools.shared.imaging-train.v1";

export interface SharedTelescopeSelection {
  readonly version: 1;
  readonly slug: string | null;
  readonly label: string;
  readonly nativeFocalLengthMm: string;
  readonly apertureMm: string;
}

export interface SharedCameraSelection {
  readonly version: 1;
  readonly slug: string | null;
  readonly label: string;
  readonly sensorWidthMm: string;
  readonly sensorHeightMm: string;
  readonly pixelSizeUm: string;
}

export interface SharedImagingTrain {
  readonly version: 1;
  readonly rigName?: string;
  readonly telescopeLabel: string;
  readonly cameraLabel: string;
  readonly nativeFocalLengthMm: string;
  readonly effectiveFocalLengthMm: string;
  readonly apertureMm: string;
  readonly opticalMultiplier: string;
  readonly pixelSizeUm: string;
  readonly binningFactor: string;
  readonly sensorWidthMm: string;
  readonly sensorHeightMm: string;
  readonly resolutionWidthPx?: string;
  readonly resolutionHeightPx?: string;
  readonly bortleClass?: string;
  readonly skyQualityMagArcsec2?: string;
}

export function imagingTrainFromConfiguration(
  state: EquipmentConfigurationState,
  rigName = "",
  site?: { bortleClass: string; skyQualityMagArcsec2: string },
): SharedImagingTrain | null {
  const telescope = telescopeSelectionFromConfiguration(state.telescope);
  const camera = cameraSelectionFromConfiguration(state.camera);
  const modifiers = resolveModifierMultipliers(state.modifiers);
  const binning = Number(state.binning);
  if (
    !telescope ||
    !camera ||
    !modifiers ||
    !Number.isFinite(binning) ||
    binning <= 0
  )
    return null;
  const opticalMultiplier = modifiers.reduce(
    (product, multiplier) => product * multiplier,
    1,
  );
  return {
    version: 1,
    ...(rigName ? { rigName } : {}),
    telescopeLabel: telescope.label,
    cameraLabel: camera.label,
    nativeFocalLengthMm: telescope.nativeFocalLengthMm,
    effectiveFocalLengthMm: String(
      Number(telescope.nativeFocalLengthMm) * opticalMultiplier,
    ),
    apertureMm: telescope.apertureMm,
    opticalMultiplier: String(opticalMultiplier),
    pixelSizeUm: camera.pixelSizeUm,
    binningFactor: String(binning),
    sensorWidthMm: camera.sensorWidthMm,
    sensorHeightMm: camera.sensorHeightMm,
    resolutionWidthPx: state.camera.resolutionWidthPx,
    resolutionHeightPx: state.camera.resolutionHeightPx,
    ...(site?.bortleClass ? { bortleClass: site.bortleClass } : {}),
    ...(site?.skyQualityMagArcsec2
      ? { skyQualityMagArcsec2: site.skyQualityMagArcsec2 }
      : {}),
  };
}

export function serializeSharedImagingTrain(
  selection: SharedImagingTrain,
): string {
  return JSON.stringify(selection);
}

export function parseSharedImagingTrain(
  value: string,
): SharedImagingTrain | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    const numericFields = [
      "nativeFocalLengthMm",
      "effectiveFocalLengthMm",
      "apertureMm",
      "opticalMultiplier",
      "pixelSizeUm",
      "binningFactor",
      "sensorWidthMm",
      "sensorHeightMm",
    ];
    if (
      candidate.version !== 1 ||
      (candidate.bortleClass !== undefined &&
        (typeof candidate.bortleClass !== "string" ||
          !/^[1-9]$/.test(candidate.bortleClass))) ||
      (candidate.skyQualityMagArcsec2 !== undefined &&
        (typeof candidate.skyQualityMagArcsec2 !== "string" ||
          !Number.isFinite(Number(candidate.skyQualityMagArcsec2)) ||
          Number(candidate.skyQualityMagArcsec2) < 10 ||
          Number(candidate.skyQualityMagArcsec2) > 25)) ||
      (candidate.rigName !== undefined &&
        (typeof candidate.rigName !== "string" ||
          candidate.rigName.length > 80 ||
          /[\u0000-\u001f\u007f]/.test(candidate.rigName))) ||
      typeof candidate.telescopeLabel !== "string" ||
      typeof candidate.cameraLabel !== "string" ||
      numericFields.some(
        (field) =>
          typeof candidate[field] !== "string" ||
          !Number.isFinite(Number(candidate[field])) ||
          Number(candidate[field]) <= 0,
      ) ||
      ["resolutionWidthPx", "resolutionHeightPx"].some(
        (field) =>
          candidate[field] !== undefined &&
          (typeof candidate[field] !== "string" ||
            !Number.isFinite(Number(candidate[field])) ||
            Number(candidate[field]) <= 0),
      )
    )
      return null;
    return candidate as unknown as SharedImagingTrain;
  } catch {
    return null;
  }
}

export function applySharedImagingTrainWhenChanged<T extends object>(
  values: T,
  selection: SharedImagingTrain | null,
  appliedSelection: string | null,
  map: (current: T, train: SharedImagingTrain) => T,
): { values: T; appliedSelection: string | null; changed: boolean } {
  if (!selection) return { values, appliedSelection, changed: false };
  const serialized = serializeSharedImagingTrain(selection);
  if (serialized === appliedSelection)
    return { values, appliedSelection, changed: false };
  return {
    values: map(values, selection),
    appliedSelection: serialized,
    changed: true,
  };
}

export function telescopeSelectionFromConfiguration(
  telescope: TelescopeConfiguration,
): SharedTelescopeSelection | null {
  const resolved = resolveTelescopeInputs(telescope);
  if (resolved.nativeFocalLengthMm === null || resolved.apertureMm === null) {
    return null;
  }
  const customised = telescopeIsCustomised(telescope);
  return {
    version: 1,
    slug: customised ? null : (telescope.lastPreset?.slug ?? null),
    label: telescope.lastPreset
      ? telescope.lastPreset.label + (customised ? " (customised)" : "")
      : "Custom telescope",
    nativeFocalLengthMm: String(resolved.nativeFocalLengthMm),
    apertureMm: String(resolved.apertureMm),
  };
}

export function serializeSharedTelescopeSelection(
  selection: SharedTelescopeSelection,
): string {
  return JSON.stringify(selection);
}

export function cameraSelectionFromConfiguration(
  camera: CameraConfiguration,
): SharedCameraSelection | null {
  const sensor = resolveCameraSensor(camera);
  if (!sensor) return null;
  const dimensions = resolveSensorDimensions(sensor);
  const customised = cameraIsCustomised(camera);
  return {
    version: 1,
    slug: customised ? null : (camera.lastPreset?.slug ?? null),
    label: camera.lastPreset
      ? camera.lastPreset.label + (customised ? " (customised)" : "")
      : "Custom camera",
    sensorWidthMm: String(dimensions.widthMm),
    sensorHeightMm: String(dimensions.heightMm),
    pixelSizeUm: String(sensor.nativePixelSizeUm),
  };
}

export function serializeSharedCameraSelection(
  selection: SharedCameraSelection,
): string {
  return JSON.stringify(selection);
}

export function parseSharedCameraSelection(
  value: string,
): SharedCameraSelection | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== 1 ||
      !(candidate.slug === null || typeof candidate.slug === "string") ||
      typeof candidate.label !== "string" ||
      candidate.label.trim() === "" ||
      ["sensorWidthMm", "sensorHeightMm", "pixelSizeUm"].some(
        (field) =>
          typeof candidate[field] !== "string" ||
          !Number.isFinite(Number(candidate[field])) ||
          Number(candidate[field]) <= 0,
      )
    )
      return null;
    return candidate as unknown as SharedCameraSelection;
  } catch {
    return null;
  }
}

export function parseSharedTelescopeSelection(
  value: string,
): SharedTelescopeSelection | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== 1 ||
      !(candidate.slug === null || typeof candidate.slug === "string") ||
      typeof candidate.label !== "string" ||
      candidate.label.trim() === "" ||
      typeof candidate.nativeFocalLengthMm !== "string" ||
      typeof candidate.apertureMm !== "string" ||
      !Number.isFinite(Number(candidate.nativeFocalLengthMm)) ||
      Number(candidate.nativeFocalLengthMm) <= 0 ||
      !Number.isFinite(Number(candidate.apertureMm)) ||
      Number(candidate.apertureMm) <= 0
    )
      return null;
    return candidate as unknown as SharedTelescopeSelection;
  } catch {
    return null;
  }
}

export function applySharedTelescopeWhenChanged<T extends object>(
  values: T,
  selection: SharedTelescopeSelection | null,
  appliedSelection: string | null,
  map: (current: T, telescope: SharedTelescopeSelection) => T,
): { values: T; appliedSelection: string | null; changed: boolean } {
  if (!selection) return { values, appliedSelection, changed: false };
  const serialized = serializeSharedTelescopeSelection(selection);
  if (serialized === appliedSelection) {
    return { values, appliedSelection, changed: false };
  }
  return {
    values: map(values, selection),
    appliedSelection: serialized,
    changed: true,
  };
}

export function applySharedCameraWhenChanged<T extends object>(
  values: T,
  selection: SharedCameraSelection | null,
  appliedSelection: string | null,
  map: (current: T, camera: SharedCameraSelection) => T,
): { values: T; appliedSelection: string | null; changed: boolean } {
  if (!selection) return { values, appliedSelection, changed: false };
  const serialized = serializeSharedCameraSelection(selection);
  if (serialized === appliedSelection)
    return { values, appliedSelection, changed: false };
  return {
    values: map(values, selection),
    appliedSelection: serialized,
    changed: true,
  };
}
