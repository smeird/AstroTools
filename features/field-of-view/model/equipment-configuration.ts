import { deriveFocalLength, type CameraSensorInput } from "@/lib/calculations";
import type {
  CameraDto,
  OpticalModifierDto,
  TelescopeDto,
} from "../services/catalogue-types";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";
import type { SensorOrientation } from "./target-framing";

export type { SensorOrientation } from "./target-framing";

export const MAX_OPTICAL_MODIFIERS = 8;
export const MIN_FOCAL_RATIO = 0.005;
export const MAX_FOCAL_RATIO = 4_000;
export const PREFERRED_TELESCOPE_SLUG = "evostar-80edx-apo-refractor";
export const PREFERRED_CAMERA_SLUG = "asi2600mc-pro";
export const PREFERRED_TARGET_SLUG = "m31-andromeda-galaxy";

export type EquipmentMode = "preset" | "manual";
export type FocalLengthMode = "direct" | "derived";
export type SensorGeometryMode = "physical-dimensions" | "pixel-resolution";
export type BinningValue = "1" | "2" | "3" | "4";
export type PhysicalDisplayUnit = "millimetres" | "inches";
export type ManualModifierType =
  "reducer" | "field-flattener" | "barlow" | "custom";

interface TelescopePresetSnapshot {
  readonly slug: string;
  readonly label: string;
  readonly nativeFocalLengthMm: string;
  readonly apertureMm: string;
}

interface CameraPresetSnapshot {
  readonly slug: string;
  readonly label: string;
  readonly sensorName: string;
  readonly sensorWidthMm: string;
  readonly sensorHeightMm: string;
  readonly pixelSizeUm: string;
  readonly resolutionWidthPx: string;
  readonly resolutionHeightPx: string;
}

export interface TelescopeConfiguration {
  readonly mode: EquipmentMode;
  readonly focalLengthMode: FocalLengthMode;
  readonly nativeFocalLengthMm: string;
  readonly apertureMm: string;
  readonly focalRatio: string;
  readonly lastPreset: TelescopePresetSnapshot | null;
}

export interface CameraConfiguration {
  readonly mode: EquipmentMode;
  readonly geometryMode: SensorGeometryMode;
  readonly sensorWidthMm: string;
  readonly sensorHeightMm: string;
  readonly pixelSizeUm: string;
  readonly resolutionWidthPx: string;
  readonly resolutionHeightPx: string;
  readonly lastPreset: CameraPresetSnapshot | null;
}

export interface OpticalModifierConfiguration {
  readonly instanceId: string;
  readonly source: "preset" | "manual";
  readonly presetSlug: string | null;
  readonly label: string;
  readonly modifierType: string;
  readonly multiplier: string;
  readonly baselineMultiplier: string | null;
  readonly compatibleNotes: string | null;
}

export interface EquipmentConfigurationState {
  readonly telescope: TelescopeConfiguration;
  readonly camera: CameraConfiguration;
  readonly modifiers: readonly OpticalModifierConfiguration[];
  readonly binning: BinningValue;
  readonly seeingFwhmArcsec: number;
  readonly targetSlug: string | null;
  readonly physicalDisplayUnit: PhysicalDisplayUnit;
  readonly framing: {
    readonly displayZoom: number;
    readonly frameRotationDeg: number;
    readonly sensorOrientation: SensorOrientation;
  };
}

export type TelescopeField =
  "nativeFocalLengthMm" | "apertureMm" | "focalRatio";
export type CameraField =
  | "sensorWidthMm"
  | "sensorHeightMm"
  | "pixelSizeUm"
  | "resolutionWidthPx"
  | "resolutionHeightPx";

export type EquipmentConfigurationAction =
  | { type: "telescope-mode"; mode: EquipmentMode }
  | { type: "telescope-preset"; preset: TelescopeDto }
  | { type: "telescope-reset" }
  | { type: "telescope-focal-mode"; mode: FocalLengthMode }
  | { type: "telescope-field"; field: TelescopeField; value: string }
  | { type: "camera-mode"; mode: EquipmentMode }
  | { type: "camera-preset"; preset: CameraDto }
  | { type: "camera-reset" }
  | { type: "camera-geometry-mode"; mode: SensorGeometryMode }
  | { type: "camera-field"; field: CameraField; value: string }
  | { type: "modifier-add"; modifier: OpticalModifierConfiguration }
  | { type: "modifier-remove"; instanceId: string }
  | {
      type: "modifier-type";
      instanceId: string;
      modifierType: ManualModifierType;
    }
  | { type: "modifier-multiplier"; instanceId: string; value: string }
  | { type: "modifier-reset"; instanceId: string }
  | { type: "modifiers-clear" }
  | { type: "binning"; value: BinningValue }
  | { type: "seeing"; value: number }
  | { type: "target"; slug: string | null }
  | { type: "physical-display-unit"; value: PhysicalDisplayUnit }
  | { type: "framing-display-zoom"; value: number }
  | { type: "framing-rotation"; value: number }
  | { type: "framing-orientation"; value: SensorOrientation };

function editableNumber(value: string | number): string {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : String(value);
}

function presetLabel(
  manufacturer: string,
  model: string,
  active: boolean,
): string {
  return (
    `${manufacturer} ${model}` + (active ? "" : " (inactive catalogue record)")
  );
}

function parseBoundedPositive(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function parseBoundedInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function nearlyEqual(left: number | null, right: number): boolean {
  if (left === null) {
    return false;
  }

  return Math.abs(left - right) <= Math.max(1, Math.abs(right)) * 1e-12;
}

function telescopeSnapshot(preset: TelescopeDto): TelescopePresetSnapshot {
  return {
    slug: preset.slug,
    label: presetLabel(preset.manufacturer.name, preset.model, preset.active),
    nativeFocalLengthMm: editableNumber(preset.nativeFocalLengthMm),
    apertureMm: editableNumber(preset.apertureMm),
  };
}

function cameraSnapshot(preset: CameraDto): CameraPresetSnapshot {
  return {
    slug: preset.slug,
    label: presetLabel(preset.manufacturer.name, preset.model, preset.active),
    sensorName: preset.sensorName,
    sensorWidthMm: editableNumber(preset.sensorWidthMm),
    sensorHeightMm: editableNumber(preset.sensorHeightMm),
    pixelSizeUm: editableNumber(preset.pixelSizeUm),
    resolutionWidthPx: editableNumber(preset.resolutionWidthPx),
    resolutionHeightPx: editableNumber(preset.resolutionHeightPx),
  };
}

function telescopeFromSnapshot(
  snapshot: TelescopePresetSnapshot,
): TelescopeConfiguration {
  const focalLength = Number(snapshot.nativeFocalLengthMm);
  const aperture = Number(snapshot.apertureMm);

  return {
    mode: "preset",
    focalLengthMode: "direct",
    nativeFocalLengthMm: snapshot.nativeFocalLengthMm,
    apertureMm: snapshot.apertureMm,
    focalRatio: String(focalLength / aperture),
    lastPreset: snapshot,
  };
}

function cameraFromSnapshot(
  snapshot: CameraPresetSnapshot,
): CameraConfiguration {
  return {
    mode: "preset",
    geometryMode: "physical-dimensions",
    sensorWidthMm: snapshot.sensorWidthMm,
    sensorHeightMm: snapshot.sensorHeightMm,
    pixelSizeUm: snapshot.pixelSizeUm,
    resolutionWidthPx: snapshot.resolutionWidthPx,
    resolutionHeightPx: snapshot.resolutionHeightPx,
    lastPreset: snapshot,
  };
}

function initialTelescope(
  presets: readonly TelescopeDto[],
): TelescopeConfiguration {
  const preset =
    presets.find(
      ({ active, slug }) => active && slug === PREFERRED_TELESCOPE_SLUG,
    ) ?? presets.find(({ active }) => active);

  return preset
    ? telescopeFromSnapshot(telescopeSnapshot(preset))
    : {
        mode: "manual",
        focalLengthMode: "direct",
        nativeFocalLengthMm: "",
        apertureMm: "",
        focalRatio: "",
        lastPreset: null,
      };
}

function initialCamera(presets: readonly CameraDto[]): CameraConfiguration {
  const preset =
    presets.find(
      ({ active, slug }) => active && slug === PREFERRED_CAMERA_SLUG,
    ) ?? presets.find(({ active }) => active);

  return preset
    ? cameraFromSnapshot(cameraSnapshot(preset))
    : {
        mode: "manual",
        geometryMode: "physical-dimensions",
        sensorWidthMm: "",
        sensorHeightMm: "",
        pixelSizeUm: "",
        resolutionWidthPx: "",
        resolutionHeightPx: "",
        lastPreset: null,
      };
}

export function telescopeFromPreset(
  preset: TelescopeDto,
): TelescopeConfiguration {
  return telescopeFromSnapshot(telescopeSnapshot(preset));
}

export function cameraFromPreset(preset: CameraDto): CameraConfiguration {
  return cameraFromSnapshot(cameraSnapshot(preset));
}

export function createEquipmentConfiguration(
  catalogue: FieldOfViewCatalogue,
): EquipmentConfigurationState {
  return {
    telescope: initialTelescope(catalogue.telescopes),
    camera: initialCamera(catalogue.cameras),
    modifiers: [],
    binning: "1",
    seeingFwhmArcsec: 2,
    targetSlug:
      catalogue.targets.find(({ slug }) => slug === PREFERRED_TARGET_SLUG)
        ?.slug ??
      catalogue.targets[0]?.slug ??
      null,
    physicalDisplayUnit: "millimetres",
    framing: {
      displayZoom: 1,
      frameRotationDeg: 0,
      sensorOrientation: "landscape",
    },
  };
}

function switchFocalLengthMode(
  telescope: TelescopeConfiguration,
  mode: FocalLengthMode,
): TelescopeConfiguration {
  if (mode === telescope.focalLengthMode) {
    return telescope;
  }

  if (mode === "derived") {
    const focalLength = parseBoundedPositive(
      telescope.nativeFocalLengthMm,
      10,
      20_000,
    );
    const aperture = parseBoundedPositive(telescope.apertureMm, 5, 2_000);

    return {
      ...telescope,
      focalLengthMode: mode,
      focalRatio:
        focalLength && aperture
          ? String(focalLength / aperture)
          : telescope.focalRatio,
    };
  }

  const derivedFocalLength =
    resolveTelescopeInputs(telescope).nativeFocalLengthMm;

  return {
    ...telescope,
    focalLengthMode: mode,
    nativeFocalLengthMm:
      derivedFocalLength === null
        ? telescope.nativeFocalLengthMm
        : String(derivedFocalLength),
  };
}

export function equipmentConfigurationReducer(
  state: EquipmentConfigurationState,
  action: EquipmentConfigurationAction,
): EquipmentConfigurationState {
  switch (action.type) {
    case "telescope-mode":
      return {
        ...state,
        telescope: {
          ...state.telescope,
          mode:
            action.mode === "preset" && !state.telescope.lastPreset
              ? "manual"
              : action.mode,
        },
      };
    case "telescope-preset":
      return {
        ...state,
        telescope: telescopeFromSnapshot(telescopeSnapshot(action.preset)),
      };
    case "telescope-reset":
      return state.telescope.lastPreset
        ? {
            ...state,
            telescope: telescopeFromSnapshot(state.telescope.lastPreset),
          }
        : state;
    case "telescope-focal-mode":
      return {
        ...state,
        telescope: switchFocalLengthMode(state.telescope, action.mode),
      };
    case "telescope-field":
      return {
        ...state,
        telescope: { ...state.telescope, [action.field]: action.value },
      };
    case "camera-mode":
      return {
        ...state,
        camera: {
          ...state.camera,
          mode:
            action.mode === "preset" && !state.camera.lastPreset
              ? "manual"
              : action.mode,
        },
      };
    case "camera-preset":
      return {
        ...state,
        camera: cameraFromSnapshot(cameraSnapshot(action.preset)),
      };
    case "camera-reset":
      return state.camera.lastPreset
        ? { ...state, camera: cameraFromSnapshot(state.camera.lastPreset) }
        : state;
    case "camera-geometry-mode":
      return {
        ...state,
        camera: { ...state.camera, geometryMode: action.mode },
      };
    case "camera-field":
      return {
        ...state,
        camera: { ...state.camera, [action.field]: action.value },
      };
    case "modifier-add":
      return state.modifiers.length >= MAX_OPTICAL_MODIFIERS
        ? state
        : { ...state, modifiers: [...state.modifiers, action.modifier] };
    case "modifier-remove":
      return {
        ...state,
        modifiers: state.modifiers.filter(
          ({ instanceId }) => instanceId !== action.instanceId,
        ),
      };
    case "modifier-type":
      return {
        ...state,
        modifiers: state.modifiers.map((modifier) =>
          modifier.instanceId === action.instanceId &&
          modifier.source === "manual"
            ? { ...modifier, modifierType: action.modifierType }
            : modifier,
        ),
      };
    case "modifier-multiplier":
      return {
        ...state,
        modifiers: state.modifiers.map((modifier) =>
          modifier.instanceId === action.instanceId
            ? { ...modifier, multiplier: action.value }
            : modifier,
        ),
      };
    case "modifier-reset":
      return {
        ...state,
        modifiers: state.modifiers.map((modifier) =>
          modifier.instanceId === action.instanceId &&
          modifier.baselineMultiplier !== null
            ? { ...modifier, multiplier: modifier.baselineMultiplier }
            : modifier,
        ),
      };
    case "modifiers-clear":
      return { ...state, modifiers: [] };
    case "binning":
      return { ...state, binning: action.value };
    case "seeing":
      return { ...state, seeingFwhmArcsec: action.value };
    case "target":
      return { ...state, targetSlug: action.slug };
    case "physical-display-unit":
      return { ...state, physicalDisplayUnit: action.value };
    case "framing-display-zoom":
      return {
        ...state,
        framing: {
          ...state.framing,
          displayZoom: Math.min(4, Math.max(0.5, action.value)),
        },
      };
    case "framing-rotation":
      return {
        ...state,
        framing: {
          ...state.framing,
          frameRotationDeg: Math.min(180, Math.max(-180, action.value)),
        },
      };
    case "framing-orientation":
      return {
        ...state,
        framing: { ...state.framing, sensorOrientation: action.value },
      };
  }
}

export function resolveTelescopeInputs(telescope: TelescopeConfiguration): {
  readonly apertureMm: number | null;
  readonly nativeFocalLengthMm: number | null;
  readonly focalRatio: number | null;
} {
  const apertureMm = parseBoundedPositive(telescope.apertureMm, 5, 2_000);
  const directFocalLengthMm = parseBoundedPositive(
    telescope.nativeFocalLengthMm,
    10,
    20_000,
  );

  if (telescope.focalLengthMode === "direct") {
    return {
      apertureMm,
      nativeFocalLengthMm: directFocalLengthMm,
      focalRatio:
        apertureMm && directFocalLengthMm
          ? directFocalLengthMm / apertureMm
          : null,
    };
  }

  const focalRatio = parseBoundedPositive(
    telescope.focalRatio,
    MIN_FOCAL_RATIO,
    MAX_FOCAL_RATIO,
  );
  let nativeFocalLengthMm: number | null = null;

  if (apertureMm && focalRatio) {
    const derived = deriveFocalLength({ apertureMm, focalRatio });
    nativeFocalLengthMm = derived >= 10 && derived <= 20_000 ? derived : null;
  }

  return { apertureMm, nativeFocalLengthMm, focalRatio };
}

export function resolveCameraSensor(
  camera: CameraConfiguration,
): CameraSensorInput | null {
  const nativePixelSizeUm = parseBoundedPositive(camera.pixelSizeUm, 0.1, 100);

  if (!nativePixelSizeUm) {
    return null;
  }

  if (camera.geometryMode === "physical-dimensions") {
    const widthMm = parseBoundedPositive(camera.sensorWidthMm, 0.1, 1_000);
    const heightMm = parseBoundedPositive(camera.sensorHeightMm, 0.1, 1_000);

    return widthMm && heightMm
      ? {
          geometry: { source: "physical-dimensions", widthMm, heightMm },
          nativePixelSizeUm,
        }
      : null;
  }

  const resolutionWidthPx = parseBoundedInteger(
    camera.resolutionWidthPx,
    1,
    200_000,
  );
  const resolutionHeightPx = parseBoundedInteger(
    camera.resolutionHeightPx,
    1,
    200_000,
  );

  return resolutionWidthPx && resolutionHeightPx
    ? {
        geometry: {
          source: "pixel-resolution",
          resolutionWidthPx,
          resolutionHeightPx,
        },
        nativePixelSizeUm,
      }
    : null;
}

export function telescopeIsCustomised(
  telescope: TelescopeConfiguration,
): boolean {
  if (!telescope.lastPreset) {
    return false;
  }

  const resolved = resolveTelescopeInputs(telescope);
  return (
    !nearlyEqual(
      resolved.nativeFocalLengthMm,
      Number(telescope.lastPreset.nativeFocalLengthMm),
    ) ||
    !nearlyEqual(resolved.apertureMm, Number(telescope.lastPreset.apertureMm))
  );
}

export function cameraIsCustomised(camera: CameraConfiguration): boolean {
  if (!camera.lastPreset) {
    return false;
  }

  const baseline = camera.lastPreset;
  return (
    camera.geometryMode !== "physical-dimensions" ||
    !nearlyEqual(
      parseBoundedPositive(camera.sensorWidthMm, 0.1, 1_000),
      Number(baseline.sensorWidthMm),
    ) ||
    !nearlyEqual(
      parseBoundedPositive(camera.sensorHeightMm, 0.1, 1_000),
      Number(baseline.sensorHeightMm),
    ) ||
    !nearlyEqual(
      parseBoundedPositive(camera.pixelSizeUm, 0.1, 100),
      Number(baseline.pixelSizeUm),
    )
  );
}

export function modifierIsCustomised(
  modifier: OpticalModifierConfiguration,
): boolean {
  return (
    modifier.baselineMultiplier !== null &&
    !nearlyEqual(
      parseBoundedPositive(modifier.multiplier, 0.1, 10),
      Number(modifier.baselineMultiplier),
    )
  );
}

export function modifierChangesEffectiveFocalRatio(
  modifier: OpticalModifierConfiguration,
): boolean | null {
  const multiplier = parseBoundedPositive(modifier.multiplier, 0.1, 10);
  return multiplier === null ? null : !nearlyEqual(multiplier, 1);
}

export function resolveModifierMultipliers(
  modifiers: readonly OpticalModifierConfiguration[],
): readonly number[] | null {
  const multipliers = modifiers.map(({ multiplier }) =>
    parseBoundedPositive(multiplier, 0.1, 10),
  );

  return multipliers.some((value) => value === null)
    ? null
    : (multipliers as number[]);
}

export function modifierFromPreset(
  preset: OpticalModifierDto,
  instanceId: string,
): OpticalModifierConfiguration {
  const multiplier = editableNumber(preset.multiplier);
  return {
    instanceId,
    source: "preset",
    presetSlug: preset.slug,
    label: presetLabel(preset.manufacturer.name, preset.model, preset.active),
    modifierType: preset.modifierType,
    multiplier,
    baselineMultiplier: multiplier,
    compatibleNotes: preset.compatibleNotes,
  };
}

export function manualModifier(
  instanceId: string,
): OpticalModifierConfiguration {
  return {
    instanceId,
    source: "manual",
    presetSlug: null,
    label: "Manual optical modifier",
    modifierType: "custom",
    multiplier: "1",
    baselineMultiplier: null,
    compatibleNotes: null,
  };
}
