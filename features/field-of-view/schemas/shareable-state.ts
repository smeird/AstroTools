import { z } from "zod";

import {
  MAX_FOCAL_RATIO,
  MAX_OPTICAL_MODIFIERS,
  MIN_FOCAL_RATIO,
  cameraFromPreset,
  createEquipmentConfiguration,
  manualModifier,
  modifierFromPreset,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
  telescopeFromPreset,
  type CameraConfiguration,
  type EquipmentConfigurationState,
  type OpticalModifierConfiguration,
  type TelescopeConfiguration,
} from "../model/equipment-configuration";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";

export const FIELD_OF_VIEW_SHARE_VERSION = "1";
export const FIELD_OF_VIEW_SHARE_PATH = "/calculators/field-of-view";
export const MANUAL_EQUIPMENT_REFERENCE = "_manual";
export const MAX_SHARE_QUERY_LENGTH = 4_096;
export const MAX_SHARE_PARAMETER_LENGTH = 191;
const MAX_NUMERIC_PARAMETER_LENGTH = 32;
export const MAX_SHARE_MODIFIER_PARAMETER_LENGTH =
  "preset".length +
  1 +
  MAX_SHARE_PARAMETER_LENGTH +
  1 +
  "field-flattener".length +
  1 +
  MAX_NUMERIC_PARAMETER_LENGTH;

const PARAMETER_KEYS = [
  "v",
  "t",
  "tm",
  "fm",
  "f",
  "a",
  "fr",
  "c",
  "cm",
  "cg",
  "sw",
  "sh",
  "px",
  "rw",
  "rh",
  "m",
  "b",
  "s",
  "target",
  "unit",
  "zoom",
  "rot",
  "orient",
] as const;

const SCALAR_PARAMETER_KEYS = PARAMETER_KEYS.filter((key) => key !== "m");

export type FieldOfViewShareParameterKey = (typeof PARAMETER_KEYS)[number];

export interface FieldOfViewPageSearchParams {
  readonly [key: string]: string | readonly string[] | undefined;
}

export interface FieldOfViewShareReferences {
  readonly telescopeSlug: string | null;
  readonly cameraSlug: string | null;
  readonly modifierSlugs: readonly string[];
}

export type FieldOfViewShareNotice =
  | { readonly kind: "unsupported-version" }
  | {
      readonly kind: "invalid-settings";
      readonly settings: readonly string[];
    };

export interface ParsedFieldOfViewShareState {
  readonly state: EquipmentConfigurationState;
  readonly notice: FieldOfViewShareNotice | null;
}

const strictDecimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const slugSchema = z
  .string()
  .min(1)
  .max(MAX_SHARE_PARAMETER_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const equipmentReferenceSchema = z.union([
  z.literal(MANUAL_EQUIPMENT_REFERENCE),
  slugSchema,
]);
const equipmentModeSchema = z.enum(["preset", "manual"]);
const focalLengthModeSchema = z.enum(["direct", "derived"]);
const cameraGeometrySchema = z.enum([
  "physical-dimensions",
  "pixel-resolution",
]);
const binningSchema = z.enum(["1", "2", "3", "4"]);
const physicalDisplayUnitSchema = z.enum(["millimetres", "inches"]);
const orientationSchema = z.enum(["landscape", "portrait"]);
const modifierSourceSchema = z.enum(["preset", "manual"]);
const modifierTypeSchema = z.enum([
  "reducer",
  "field-flattener",
  "barlow",
  "custom",
]);

function strictNumberSchema(minimum: number, maximum: number, integer = false) {
  return z
    .string()
    .min(1)
    .max(MAX_NUMERIC_PARAMETER_LENGTH)
    .regex(strictDecimalPattern)
    .transform(Number)
    .pipe(
      z
        .number()
        .finite()
        .min(minimum)
        .max(maximum)
        .refine((value) => !integer || Number.isSafeInteger(value)),
    );
}

const focalLengthSchema = strictNumberSchema(10, 20_000);
const apertureSchema = strictNumberSchema(5, 2_000);
const focalRatioSchema = strictNumberSchema(MIN_FOCAL_RATIO, MAX_FOCAL_RATIO);
const sensorDimensionSchema = strictNumberSchema(0.1, 1_000);
const pixelSizeSchema = strictNumberSchema(0.1, 100);
const resolutionSchema = strictNumberSchema(1, 200_000, true);
const modifierMultiplierSchema = strictNumberSchema(0.1, 10);
const seeingSchema = strictNumberSchema(0.5, 10);
const displayZoomSchema = strictNumberSchema(0.5, 4);
const frameRotationSchema = strictNumberSchema(-180, 180, true);

function canonicalNumber(value: number): string {
  return Object.is(value, -0) ? "0" : String(value);
}

function addInvalidSetting(invalidSettings: Set<string>, label: string) {
  if (invalidSettings.size < 12) {
    invalidSettings.add(label);
  }
}

function readScalar<T>(
  searchParams: URLSearchParams,
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
  invalidSettings: Set<string>,
  label: string,
): T {
  const values = searchParams.getAll(key);
  if (values.length === 0) {
    return fallback;
  }
  if (values.length !== 1) {
    addInvalidSetting(invalidSettings, label);
    return fallback;
  }

  const parsed = schema.safeParse(values[0]);
  if (!parsed.success) {
    addInvalidSetting(invalidSettings, label);
    return fallback;
  }
  return parsed.data;
}

function readOptionalScalar<T>(
  searchParams: URLSearchParams,
  key: string,
  schema: z.ZodType<T>,
  invalidSettings: Set<string>,
  label: string,
): T | undefined {
  return readScalar(
    searchParams,
    key,
    schema.optional(),
    undefined,
    invalidSettings,
    label,
  );
}

function parseModifier(
  value: string,
  index: number,
  catalogue: FieldOfViewCatalogue,
  invalidSettings: Set<string>,
): OpticalModifierConfiguration | null {
  if (value.length > MAX_SHARE_MODIFIER_PARAMETER_LENGTH) {
    addInvalidSetting(invalidSettings, "optical modifiers");
    return null;
  }

  const parts = value.split(":");
  if (parts.length !== 4) {
    addInvalidSetting(invalidSettings, "optical modifiers");
    return null;
  }

  const [rawSource, rawReference, rawType, rawMultiplier] = parts;
  const source = modifierSourceSchema.safeParse(rawSource);
  const type = modifierTypeSchema.safeParse(rawType);
  const multiplier = modifierMultiplierSchema.safeParse(rawMultiplier);
  if (!source.success || !type.success || !multiplier.success) {
    addInvalidSetting(invalidSettings, "optical modifiers");
    return null;
  }

  const instanceId = `url-modifier-${index + 1}`;
  if (source.data === "manual") {
    if (rawReference !== "manual") {
      addInvalidSetting(invalidSettings, "optical modifiers");
      return null;
    }
    return {
      ...manualModifier(instanceId),
      modifierType: type.data,
      multiplier: canonicalNumber(multiplier.data),
    };
  }

  const reference = slugSchema.safeParse(rawReference);
  if (!reference.success) {
    addInvalidSetting(invalidSettings, "optical modifiers");
    return null;
  }
  const preset = catalogue.opticalModifiers.find(
    ({ slug }) => slug === reference.data,
  );
  if (!preset) {
    addInvalidSetting(invalidSettings, "optical modifier preset");
    return {
      ...manualModifier(instanceId),
      modifierType: type.data,
      multiplier: canonicalNumber(multiplier.data),
    };
  }

  return {
    ...modifierFromPreset(preset, instanceId),
    multiplier: canonicalNumber(multiplier.data),
  };
}

function hasRecognisedStateParameter(searchParams: URLSearchParams): boolean {
  return PARAMETER_KEYS.some((key) => key !== "v" && searchParams.has(key));
}

function invalidNotice(
  invalidSettings: Set<string>,
): FieldOfViewShareNotice | null {
  return invalidSettings.size === 0
    ? null
    : { kind: "invalid-settings", settings: [...invalidSettings] };
}

export function parseFieldOfViewShareState(
  searchParams: URLSearchParams,
  catalogue: FieldOfViewCatalogue,
): ParsedFieldOfViewShareState {
  const defaultState = createEquipmentConfiguration(catalogue);
  if (!searchParams.has("v") && !hasRecognisedStateParameter(searchParams)) {
    return { state: defaultState, notice: null };
  }
  if (searchParams.toString().length > MAX_SHARE_QUERY_LENGTH) {
    return {
      state: defaultState,
      notice: { kind: "invalid-settings", settings: ["shared link"] },
    };
  }

  const versions = searchParams.getAll("v");
  if (versions.length !== 1 || versions[0] !== FIELD_OF_VIEW_SHARE_VERSION) {
    return { state: defaultState, notice: { kind: "unsupported-version" } };
  }

  const invalidSettings = new Set<string>();
  const telescopeReference = readOptionalScalar(
    searchParams,
    "t",
    equipmentReferenceSchema,
    invalidSettings,
    "telescope preset",
  );
  let telescope: TelescopeConfiguration = defaultState.telescope;
  if (telescopeReference === MANUAL_EQUIPMENT_REFERENCE) {
    telescope = {
      ...defaultState.telescope,
      mode: "manual",
      lastPreset: null,
    };
  } else if (telescopeReference) {
    const preset = catalogue.telescopes.find(
      ({ slug }) => slug === telescopeReference,
    );
    if (preset) {
      telescope = telescopeFromPreset(preset);
    } else {
      addInvalidSetting(invalidSettings, "telescope preset");
      telescope = {
        ...defaultState.telescope,
        mode: "manual",
        lastPreset: null,
      };
    }
  }

  const telescopeMode = readScalar(
    searchParams,
    "tm",
    equipmentModeSchema,
    telescope.mode,
    invalidSettings,
    "telescope source",
  );
  const resolvedTelescopeMode =
    telescopeMode === "preset" && telescope.lastPreset === null
      ? (addInvalidSetting(invalidSettings, "telescope source"), "manual")
      : telescopeMode;
  const focalLengthMode = readScalar(
    searchParams,
    "fm",
    focalLengthModeSchema,
    telescope.focalLengthMode,
    invalidSettings,
    "focal-length mode",
  );
  const nativeFocalLengthMm = readScalar(
    searchParams,
    "f",
    focalLengthSchema,
    Number(telescope.nativeFocalLengthMm),
    invalidSettings,
    "native focal length",
  );
  const apertureMm = readScalar(
    searchParams,
    "a",
    apertureSchema,
    Number(telescope.apertureMm),
    invalidSettings,
    "aperture",
  );
  const focalRatio = readScalar(
    searchParams,
    "fr",
    focalRatioSchema,
    Number(telescope.focalRatio),
    invalidSettings,
    "focal ratio",
  );
  if (
    focalLengthMode === "derived" &&
    (apertureMm * focalRatio < 10 || apertureMm * focalRatio > 20_000)
  ) {
    addInvalidSetting(invalidSettings, "derived focal length");
    telescope = {
      ...telescope,
      mode: resolvedTelescopeMode,
    };
  } else {
    telescope = {
      ...telescope,
      mode: resolvedTelescopeMode,
      focalLengthMode,
      nativeFocalLengthMm: canonicalNumber(nativeFocalLengthMm),
      apertureMm: canonicalNumber(apertureMm),
      focalRatio: canonicalNumber(focalRatio),
    };
  }

  const cameraReference = readOptionalScalar(
    searchParams,
    "c",
    equipmentReferenceSchema,
    invalidSettings,
    "camera preset",
  );
  let camera: CameraConfiguration = defaultState.camera;
  if (cameraReference === MANUAL_EQUIPMENT_REFERENCE) {
    camera = { ...defaultState.camera, mode: "manual", lastPreset: null };
  } else if (cameraReference) {
    const preset = catalogue.cameras.find(
      ({ slug }) => slug === cameraReference,
    );
    if (preset) {
      camera = cameraFromPreset(preset);
    } else {
      addInvalidSetting(invalidSettings, "camera preset");
      camera = { ...defaultState.camera, mode: "manual", lastPreset: null };
    }
  }

  const cameraMode = readScalar(
    searchParams,
    "cm",
    equipmentModeSchema,
    camera.mode,
    invalidSettings,
    "camera source",
  );
  const resolvedCameraMode =
    cameraMode === "preset" && camera.lastPreset === null
      ? (addInvalidSetting(invalidSettings, "camera source"), "manual")
      : cameraMode;
  camera = {
    ...camera,
    mode: resolvedCameraMode,
    geometryMode: readScalar(
      searchParams,
      "cg",
      cameraGeometrySchema,
      camera.geometryMode,
      invalidSettings,
      "sensor geometry",
    ),
    sensorWidthMm: canonicalNumber(
      readScalar(
        searchParams,
        "sw",
        sensorDimensionSchema,
        Number(camera.sensorWidthMm),
        invalidSettings,
        "sensor width",
      ),
    ),
    sensorHeightMm: canonicalNumber(
      readScalar(
        searchParams,
        "sh",
        sensorDimensionSchema,
        Number(camera.sensorHeightMm),
        invalidSettings,
        "sensor height",
      ),
    ),
    pixelSizeUm: canonicalNumber(
      readScalar(
        searchParams,
        "px",
        pixelSizeSchema,
        Number(camera.pixelSizeUm),
        invalidSettings,
        "pixel size",
      ),
    ),
    resolutionWidthPx: canonicalNumber(
      readScalar(
        searchParams,
        "rw",
        resolutionSchema,
        Number(camera.resolutionWidthPx),
        invalidSettings,
        "sensor resolution",
      ),
    ),
    resolutionHeightPx: canonicalNumber(
      readScalar(
        searchParams,
        "rh",
        resolutionSchema,
        Number(camera.resolutionHeightPx),
        invalidSettings,
        "sensor resolution",
      ),
    ),
  };

  const modifierValues = searchParams.getAll("m");
  if (modifierValues.length > MAX_OPTICAL_MODIFIERS) {
    addInvalidSetting(invalidSettings, "optical modifiers");
  }
  const modifiers = modifierValues
    .slice(0, MAX_OPTICAL_MODIFIERS)
    .map((value, index) =>
      parseModifier(value, index, catalogue, invalidSettings),
    )
    .filter(
      (modifier): modifier is OpticalModifierConfiguration => modifier !== null,
    );

  const targetSlug = readScalar(
    searchParams,
    "target",
    slugSchema,
    defaultState.targetSlug ?? "",
    invalidSettings,
    "astronomical target",
  );
  const resolvedTargetSlug = catalogue.targets.some(
    ({ slug }) => slug === targetSlug,
  )
    ? targetSlug
    : (addInvalidSetting(invalidSettings, "astronomical target"),
      defaultState.targetSlug);

  const state: EquipmentConfigurationState = {
    telescope,
    camera,
    modifiers,
    binning: readScalar(
      searchParams,
      "b",
      binningSchema,
      defaultState.binning,
      invalidSettings,
      "binning",
    ),
    seeingFwhmArcsec: readScalar(
      searchParams,
      "s",
      seeingSchema,
      defaultState.seeingFwhmArcsec,
      invalidSettings,
      "seeing",
    ),
    targetSlug: resolvedTargetSlug,
    physicalDisplayUnit: readScalar(
      searchParams,
      "unit",
      physicalDisplayUnitSchema,
      defaultState.physicalDisplayUnit,
      invalidSettings,
      "display units",
    ),
    framing: {
      displayZoom: readScalar(
        searchParams,
        "zoom",
        displayZoomSchema,
        defaultState.framing.displayZoom,
        invalidSettings,
        "display zoom",
      ),
      frameRotationDeg: readScalar(
        searchParams,
        "rot",
        frameRotationSchema,
        defaultState.framing.frameRotationDeg,
        invalidSettings,
        "frame rotation",
      ),
      sensorOrientation: readScalar(
        searchParams,
        "orient",
        orientationSchema,
        defaultState.framing.sensorOrientation,
        invalidSettings,
        "sensor orientation",
      ),
    },
  };

  return { state, notice: invalidNotice(invalidSettings) };
}

function parseStateNumber(
  value: string | number,
  schema: z.ZodType<number>,
): number | null {
  const parsed = schema.safeParse(String(value));
  return parsed.success ? parsed.data : null;
}

export function serializeFieldOfViewShareState(
  state: EquipmentConfigurationState,
): URLSearchParams | null {
  const telescope = resolveTelescopeInputs(state.telescope);
  const cameraSensor = resolveCameraSensor(state.camera);
  const modifiers = resolveModifierMultipliers(state.modifiers);
  const seeing = seeingSchema.safeParse(String(state.seeingFwhmArcsec));
  const zoom = displayZoomSchema.safeParse(String(state.framing.displayZoom));
  const rotation = frameRotationSchema.safeParse(
    String(state.framing.frameRotationDeg),
  );
  const target = state.targetSlug
    ? slugSchema.safeParse(state.targetSlug)
    : { success: false as const };
  const telescopeReference =
    state.telescope.lastPreset?.slug ?? MANUAL_EQUIPMENT_REFERENCE;
  const cameraReference =
    state.camera.lastPreset?.slug ?? MANUAL_EQUIPMENT_REFERENCE;
  if (
    telescope.nativeFocalLengthMm === null ||
    telescope.apertureMm === null ||
    telescope.focalRatio === null ||
    !cameraSensor ||
    state.modifiers.length > MAX_OPTICAL_MODIFIERS ||
    !modifiers ||
    !seeing.success ||
    !zoom.success ||
    !rotation.success ||
    !target.success ||
    !equipmentReferenceSchema.safeParse(telescopeReference).success ||
    !equipmentReferenceSchema.safeParse(cameraReference).success
  ) {
    return null;
  }

  const sensorWidth = parseStateNumber(
    state.camera.sensorWidthMm,
    sensorDimensionSchema,
  );
  const sensorHeight = parseStateNumber(
    state.camera.sensorHeightMm,
    sensorDimensionSchema,
  );
  const pixelSize = parseStateNumber(state.camera.pixelSizeUm, pixelSizeSchema);
  const resolutionWidth = parseStateNumber(
    state.camera.resolutionWidthPx,
    resolutionSchema,
  );
  const resolutionHeight = parseStateNumber(
    state.camera.resolutionHeightPx,
    resolutionSchema,
  );
  if (pixelSize === null) {
    return null;
  }
  if (
    state.camera.geometryMode === "physical-dimensions" &&
    (sensorWidth === null || sensorHeight === null)
  ) {
    return null;
  }
  if (
    state.camera.geometryMode === "pixel-resolution" &&
    (resolutionWidth === null || resolutionHeight === null)
  ) {
    return null;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("v", FIELD_OF_VIEW_SHARE_VERSION);
  searchParams.set("t", telescopeReference);
  searchParams.set("tm", state.telescope.mode);
  searchParams.set("fm", state.telescope.focalLengthMode);
  searchParams.set("f", canonicalNumber(telescope.nativeFocalLengthMm));
  searchParams.set("a", canonicalNumber(telescope.apertureMm));
  searchParams.set("fr", canonicalNumber(telescope.focalRatio));
  searchParams.set("c", cameraReference);
  searchParams.set("cm", state.camera.mode);
  searchParams.set("cg", state.camera.geometryMode);
  if (sensorWidth !== null) {
    searchParams.set("sw", canonicalNumber(sensorWidth));
  }
  if (sensorHeight !== null) {
    searchParams.set("sh", canonicalNumber(sensorHeight));
  }
  searchParams.set("px", canonicalNumber(pixelSize));
  if (resolutionWidth !== null) {
    searchParams.set("rw", canonicalNumber(resolutionWidth));
  }
  if (resolutionHeight !== null) {
    searchParams.set("rh", canonicalNumber(resolutionHeight));
  }
  for (const modifier of state.modifiers) {
    const type = modifierTypeSchema.safeParse(modifier.modifierType);
    const multiplier = modifierMultiplierSchema.safeParse(modifier.multiplier);
    const reference = modifier.presetSlug ?? "manual";
    if (
      !multiplier.success ||
      (modifier.source === "preset" &&
        !slugSchema.safeParse(reference).success) ||
      (modifier.source === "manual" && !type.success)
    ) {
      return null;
    }
    const serializedType = type.success ? type.data : "custom";
    searchParams.append(
      "m",
      `${modifier.source}:${reference}:${serializedType}:${canonicalNumber(multiplier.data)}`,
    );
  }
  searchParams.set("b", state.binning);
  searchParams.set("s", canonicalNumber(seeing.data));
  searchParams.set("target", target.data);
  searchParams.set("unit", state.physicalDisplayUnit);
  searchParams.set("zoom", canonicalNumber(zoom.data));
  searchParams.set("rot", canonicalNumber(rotation.data));
  searchParams.set("orient", state.framing.sensorOrientation);
  return searchParams;
}

export function normaliseFieldOfViewPageSearchParams(
  rawSearchParams: FieldOfViewPageSearchParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const key of SCALAR_PARAMETER_KEYS) {
    const rawValue = rawSearchParams[key];
    const values = Array.isArray(rawValue) ? rawValue.slice(0, 2) : [rawValue];
    for (const value of values) {
      if (typeof value === "string") {
        searchParams.append(
          key,
          value.slice(0, MAX_SHARE_PARAMETER_LENGTH + 1),
        );
      }
    }
  }
  const rawModifiers = rawSearchParams.m;
  const modifierValues = Array.isArray(rawModifiers)
    ? rawModifiers.slice(0, MAX_OPTICAL_MODIFIERS + 1)
    : [rawModifiers];
  for (const value of modifierValues) {
    if (typeof value === "string") {
      searchParams.append(
        "m",
        value.slice(0, MAX_SHARE_MODIFIER_PARAMETER_LENGTH + 1),
      );
    }
  }
  return searchParams;
}

export function extractFieldOfViewShareReferences(
  searchParams: URLSearchParams,
): FieldOfViewShareReferences {
  if (
    searchParams.getAll("v").length !== 1 ||
    searchParams.get("v") !== FIELD_OF_VIEW_SHARE_VERSION
  ) {
    return { telescopeSlug: null, cameraSlug: null, modifierSlugs: [] };
  }

  const telescope = equipmentReferenceSchema.safeParse(searchParams.get("t"));
  const camera = equipmentReferenceSchema.safeParse(searchParams.get("c"));
  const modifierSlugs: string[] = [];
  for (const value of searchParams
    .getAll("m")
    .slice(0, MAX_OPTICAL_MODIFIERS)) {
    const [source, reference] = value.split(":");
    if (
      source === "preset" &&
      slugSchema.safeParse(reference).success &&
      !modifierSlugs.includes(reference!)
    ) {
      modifierSlugs.push(reference!);
    }
  }

  return {
    telescopeSlug:
      telescope.success && telescope.data !== MANUAL_EQUIPMENT_REFERENCE
        ? telescope.data
        : null,
    cameraSlug:
      camera.success && camera.data !== MANUAL_EQUIPMENT_REFERENCE
        ? camera.data
        : null,
    modifierSlugs,
  };
}
