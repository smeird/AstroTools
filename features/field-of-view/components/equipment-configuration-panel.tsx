"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";

import {
  Combobox,
  NumericInput,
  RangeInput,
  SegmentedControl,
  type ComboboxOption,
} from "@/components/design-system";
import type {
  BinningValue,
  EquipmentConfigurationAction,
  EquipmentConfigurationState,
  EquipmentMode,
  FocalLengthMode,
  ManualModifierType,
  SensorGeometryMode,
} from "../model/equipment-configuration";
import {
  MAX_FOCAL_RATIO,
  MAX_OPTICAL_MODIFIERS,
  MIN_FOCAL_RATIO,
  cameraIsCustomised,
  manualModifier,
  modifierChangesEffectiveFocalRatio,
  modifierFromPreset,
  modifierIsCustomised,
  resolveTelescopeInputs,
  telescopeIsCustomised,
} from "../model/equipment-configuration";
import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";

import styles from "./equipment-configuration-panel.module.css";

const EQUIPMENT_MODE_OPTIONS = [
  { value: "preset", label: "Catalogue preset" },
  { value: "manual", label: "Manual" },
] as const;

const FOCAL_LENGTH_MODE_OPTIONS = [
  { value: "direct", label: "Direct focal length" },
  { value: "derived", label: "Derive from focal ratio" },
] as const;

const SENSOR_GEOMETRY_OPTIONS = [
  { value: "physical-dimensions", label: "Physical dimensions" },
  { value: "pixel-resolution", label: "Pixel resolution" },
] as const;

const BINNING_OPTIONS = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "3", label: "3×" },
  { value: "4", label: "4×" },
] as const;

const MANUAL_MODIFIER_TYPE_OPTIONS = [
  { value: "reducer", label: "Reducer" },
  { value: "field-flattener", label: "Field flattener" },
  { value: "barlow", label: "Barlow" },
  { value: "custom", label: "Custom" },
] as const;

interface EquipmentConfigurationPanelProps {
  catalogue: FieldOfViewCatalogue;
  state: EquipmentConfigurationState;
  dispatch: Dispatch<EquipmentConfigurationAction>;
}

function telescopeLabel(
  preset: FieldOfViewCatalogue["telescopes"][number],
): string {
  return (
    preset.manufacturer.name +
    " " +
    preset.model +
    (preset.active ? "" : " (inactive catalogue record)")
  );
}

function cameraLabel(preset: FieldOfViewCatalogue["cameras"][number]): string {
  return (
    preset.manufacturer.name +
    " " +
    preset.model +
    (preset.active ? "" : " (inactive catalogue record)")
  );
}

function modifierLabel(
  preset: FieldOfViewCatalogue["opticalModifiers"][number],
): string {
  return (
    preset.manufacturer.name +
    " " +
    preset.model +
    (preset.active ? "" : " (inactive catalogue record)")
  );
}

function targetLabel(target: FieldOfViewCatalogue["targets"][number]): string {
  return target.catalogueName === target.commonName
    ? target.commonName
    : target.commonName + " · " + target.catalogueName;
}

function equipmentStatus(
  mode: EquipmentMode,
  presetLabel: string | undefined,
  customised: boolean,
): string {
  if (!presetLabel) {
    return "Manual values";
  }
  if (mode === "manual") {
    return customised
      ? "Manual values · customised from " + presetLabel
      : "Manual values · based on " + presetLabel;
  }
  if (customised) {
    return "Customised preset · " + presetLabel;
  }
  return "Catalogue preset · " + presetLabel;
}

function readableModifierType(modifierType: string): string {
  switch (modifierType) {
    case "field-flattener":
      return "Field flattener";
    case "barlow":
      return "Barlow";
    case "reducer":
      return "Reducer";
    case "custom":
      return "Custom";
    default:
      return modifierType;
  }
}

function focalRatioEffect(
  modifier: EquipmentConfigurationState["modifiers"][number],
): string {
  const changesFocalRatio = modifierChangesEffectiveFocalRatio(modifier);
  if (changesFocalRatio === null) {
    return "Focal-ratio effect is unavailable until the multiplier is valid.";
  }

  return changesFocalRatio
    ? "Changes effective focal length and focal ratio: yes."
    : "Changes effective focal length and focal ratio: no at 1×.";
}

function numericError(
  value: string,
  minimum: number,
  maximum: number,
  message: string,
  integer = false,
): string | undefined {
  const parsed = Number(value);
  const valid =
    Number.isFinite(parsed) &&
    parsed >= minimum &&
    parsed <= maximum &&
    (!integer || Number.isSafeInteger(parsed));

  return valid ? undefined : message;
}

export function EquipmentConfigurationPanel({
  catalogue,
  state,
  dispatch,
}: EquipmentConfigurationPanelProps) {
  const telescopePreset = catalogue.telescopes.find(
    ({ slug }) => slug === state.telescope.lastPreset?.slug,
  );
  const cameraPreset = catalogue.cameras.find(
    ({ slug }) => slug === state.camera.lastPreset?.slug,
  );
  const selectedTarget = catalogue.targets.find(
    ({ slug }) => slug === state.targetSlug,
  );
  const telescopeOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      catalogue.telescopes.map((preset) => ({
        value: preset.slug,
        label: telescopeLabel(preset),
        searchText:
          preset.opticalDesign +
          " " +
          preset.nativeFocalLengthMm +
          " mm " +
          preset.apertureMm +
          " mm",
      })),
    [catalogue.telescopes],
  );
  const cameraOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      catalogue.cameras.map((preset) => ({
        value: preset.slug,
        label: cameraLabel(preset),
        searchText:
          preset.sensorName + " " + preset.sensorType + " " + preset.colourMode,
      })),
    [catalogue.cameras],
  );
  const modifierOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      catalogue.opticalModifiers.map((preset) => ({
        value: preset.slug,
        label: modifierLabel(preset),
        searchText: preset.modifierType + " " + preset.multiplier + "x",
        disabled: state.modifiers.some(
          ({ presetSlug }) => presetSlug === preset.slug,
        ),
      })),
    [catalogue.opticalModifiers, state.modifiers],
  );
  const targetOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      catalogue.targets.map((target) => ({
        value: target.slug,
        label: targetLabel(target),
        searchText: target.category,
      })),
    [catalogue.targets],
  );
  const [telescopeQuery, setTelescopeQuery] = useState(
    telescopePreset ? telescopeLabel(telescopePreset) : "",
  );
  const [telescopeSelection, setTelescopeSelection] = useState<string | null>(
    telescopePreset?.slug ?? null,
  );
  const [cameraQuery, setCameraQuery] = useState(
    cameraPreset ? cameraLabel(cameraPreset) : "",
  );
  const [cameraSelection, setCameraSelection] = useState<string | null>(
    cameraPreset?.slug ?? null,
  );
  const [modifierQuery, setModifierQuery] = useState("");
  const [modifierSelection, setModifierSelection] = useState<string | null>(
    null,
  );
  const [targetQuery, setTargetQuery] = useState(
    selectedTarget ? targetLabel(selectedTarget) : "",
  );
  const [targetSelection, setTargetSelection] = useState<string | null>(
    selectedTarget?.slug ?? null,
  );
  const nextModifierId = useRef(1);
  const addManualModifierRef = useRef<HTMLButtonElement>(null);
  const modifierRemoveRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingModifierFocus = useRef<string | "add-manual" | null>(null);
  const telescopeInputs = resolveTelescopeInputs(state.telescope);
  const derivedFocalLength = telescopeInputs.nativeFocalLengthMm;
  const telescopeCustomised = telescopeIsCustomised(state.telescope);
  const cameraCustomised = cameraIsCustomised(state.camera);
  const catalogueUnavailable = catalogue.status === "unavailable";
  const modifierLimitReached = state.modifiers.length >= MAX_OPTICAL_MODIFIERS;

  useEffect(() => {
    const pendingFocus = pendingModifierFocus.current;
    if (!pendingFocus) {
      return;
    }

    const target =
      pendingFocus === "add-manual"
        ? addManualModifierRef.current
        : modifierRemoveRefs.current.get(pendingFocus);
    target?.focus();
    pendingModifierFocus.current = null;
  }, [state.modifiers]);

  function createModifierId(): string {
    let identifier: string;
    do {
      identifier = "modifier-" + nextModifierId.current;
      nextModifierId.current += 1;
    } while (
      state.modifiers.some(({ instanceId }) => instanceId === identifier)
    );
    return identifier;
  }

  function selectTelescope(value: string | null) {
    setTelescopeSelection(value);
    if (!value || value === state.telescope.lastPreset?.slug) {
      return;
    }

    const preset = catalogue.telescopes.find(({ slug }) => slug === value);
    if (preset) {
      dispatch({ type: "telescope-preset", preset });
    }
  }

  function selectCamera(value: string | null) {
    setCameraSelection(value);
    if (!value || value === state.camera.lastPreset?.slug) {
      return;
    }

    const preset = catalogue.cameras.find(({ slug }) => slug === value);
    if (preset) {
      dispatch({ type: "camera-preset", preset });
    }
  }

  function addSelectedModifier() {
    const preset = catalogue.opticalModifiers.find(
      ({ slug }) => slug === modifierSelection,
    );
    if (!preset || modifierLimitReached) {
      return;
    }

    dispatch({
      type: "modifier-add",
      modifier: modifierFromPreset(preset, createModifierId()),
    });
    setModifierSelection(null);
    setModifierQuery("");
  }

  function removeModifier(instanceId: string, index: number) {
    pendingModifierFocus.current =
      state.modifiers[index - 1]?.instanceId ??
      state.modifiers[index + 1]?.instanceId ??
      "add-manual";
    dispatch({ type: "modifier-remove", instanceId });
  }

  function clearModifiers() {
    pendingModifierFocus.current = "add-manual";
    dispatch({ type: "modifiers-clear" });
  }

  return (
    <section className={styles.panel} aria-labelledby="equipment-title">
      <div className={styles.panelHeader}>
        <p className="eyebrow">Your imaging train</p>
        <h2 id="equipment-title">Configure the optical path</h2>
        <p>
          Start from verified presets or enter every value manually. Focal
          length remains the primary field-of-view input.
        </p>
      </div>

      {catalogueUnavailable ? (
        <p className={styles.notice} role="note">
          The equipment catalogue is temporarily unavailable. Manual
          configuration remains fully usable; no substitute preset data has been
          applied.
        </p>
      ) : null}

      <div className={styles.controlGroup}>
        <section
          className={styles.subsection}
          aria-labelledby="telescope-title"
        >
          <div className={styles.subsectionHeader}>
            <span className={styles.step}>01</span>
            <div>
              <h3 id="telescope-title">Telescope</h3>
              <p>
                Choose a sourced model or keep the current values as manual.
              </p>
            </div>
          </div>

          <SegmentedControl<EquipmentMode>
            description="Manual mode preserves the current focal length and aperture."
            id="telescope-mode"
            label="Telescope source"
            name="telescope-mode"
            onValueChange={(mode) => dispatch({ type: "telescope-mode", mode })}
            options={EQUIPMENT_MODE_OPTIONS.map((option) => ({
              ...option,
              disabled:
                option.value === "preset" &&
                (!state.telescope.lastPreset || catalogueUnavailable),
            }))}
            value={state.telescope.mode}
          />

          <Combobox
            description="Search by manufacturer or model; choosing a result populates every known telescope value."
            disabled={state.telescope.mode === "manual" || catalogueUnavailable}
            error={
              state.telescope.mode === "preset" && !telescopeSelection
                ? "Choose a telescope preset or switch to Manual. Current values are unchanged."
                : undefined
            }
            id="telescope-preset"
            label="Telescope preset"
            name="telescope-preset"
            noResultsText="No matching telescope presets"
            onQueryChange={setTelescopeQuery}
            onSelectionChange={selectTelescope}
            options={telescopeOptions}
            query={telescopeQuery}
            required={state.telescope.mode === "preset"}
            selectedValue={telescopeSelection}
          />

          <p className={styles.status} data-testid="telescope-status">
            {equipmentStatus(
              state.telescope.mode,
              state.telescope.lastPreset?.label,
              telescopeCustomised,
            )}
          </p>

          {telescopePreset ? (
            <p className={styles.provenance}>
              {telescopePreset.opticalDesign}. Verified{" "}
              <time dateTime={telescopePreset.verifiedAt}>
                {telescopePreset.verifiedAt.slice(0, 10)}
              </time>
              . <a href={telescopePreset.sourceUrl}>Source specification</a>.
            </p>
          ) : null}

          <SegmentedControl<FocalLengthMode>
            description="Derived mode explicitly couples aperture and focal ratio; direct mode does not."
            id="focal-length-mode"
            label="Focal length input"
            name="focal-length-mode"
            onValueChange={(mode) =>
              dispatch({ type: "telescope-focal-mode", mode })
            }
            options={FOCAL_LENGTH_MODE_OPTIONS}
            value={state.telescope.focalLengthMode}
          />

          <NumericInput
            description={
              state.telescope.focalLengthMode === "direct"
                ? "The principal input controlling field of view."
                : "Calculated at full precision from aperture × focal ratio."
            }
            error={
              state.telescope.focalLengthMode === "direct"
                ? numericError(
                    state.telescope.nativeFocalLengthMm,
                    10,
                    20_000,
                    "Enter a focal length from 10 to 20,000 mm.",
                  )
                : derivedFocalLength
                  ? undefined
                  : "Enter values that derive a focal length from 10 to 20,000 mm."
            }
            id="focal-length"
            label="Native focal length"
            max={20_000}
            min={10}
            name="focal-length"
            onValueChange={(value) =>
              dispatch({
                type: "telescope-field",
                field: "nativeFocalLengthMm",
                value,
              })
            }
            readOnly={state.telescope.focalLengthMode === "derived"}
            required
            step="any"
            unit="mm"
            unitLabel="millimetres"
            value={
              state.telescope.focalLengthMode === "derived"
                ? derivedFocalLength === null
                  ? ""
                  : String(derivedFocalLength)
                : state.telescope.nativeFocalLengthMm
            }
          />

          <NumericInput
            description={
              state.telescope.focalLengthMode === "direct"
                ? "Used to calculate focal ratio; changing aperture alone does not alter field of view."
                : "In derived mode, aperture deliberately contributes to focal length."
            }
            error={numericError(
              state.telescope.apertureMm,
              5,
              2_000,
              "Enter an aperture from 5 to 2,000 mm.",
            )}
            id="aperture"
            label="Aperture"
            max={2_000}
            min={5}
            name="aperture"
            onValueChange={(value) =>
              dispatch({
                type: "telescope-field",
                field: "apertureMm",
                value,
              })
            }
            required
            step="any"
            unit="mm"
            unitLabel="millimetres"
            value={state.telescope.apertureMm}
          />

          <NumericInput
            description={
              state.telescope.focalLengthMode === "direct"
                ? "Calculated as N in f/N from native focal length ÷ aperture."
                : "Enter N in f/N; it is used with aperture to derive native focal length."
            }
            error={
              state.telescope.focalLengthMode === "derived"
                ? numericError(
                    state.telescope.focalRatio,
                    MIN_FOCAL_RATIO,
                    MAX_FOCAL_RATIO,
                    "Enter a focal ratio from 0.005 to 4,000.",
                  )
                : undefined
            }
            id="focal-ratio"
            label="Native focal ratio"
            max={MAX_FOCAL_RATIO}
            min={MIN_FOCAL_RATIO}
            name="focal-ratio"
            onValueChange={(value) =>
              dispatch({
                type: "telescope-field",
                field: "focalRatio",
                value,
              })
            }
            readOnly={state.telescope.focalLengthMode === "direct"}
            required
            step="any"
            value={
              state.telescope.focalLengthMode === "direct"
                ? telescopeInputs.focalRatio === null
                  ? ""
                  : String(telescopeInputs.focalRatio)
                : state.telescope.focalRatio
            }
          />

          <button
            className={styles.secondaryButton}
            disabled={!state.telescope.lastPreset}
            onClick={() => {
              dispatch({ type: "telescope-reset" });
              if (telescopePreset) {
                setTelescopeSelection(telescopePreset.slug);
                setTelescopeQuery(telescopeLabel(telescopePreset));
              }
            }}
            type="button"
          >
            {state.telescope.lastPreset
              ? "Restore " + state.telescope.lastPreset.label + " preset"
              : "No telescope preset to restore"}
          </button>
        </section>

        <section
          className={styles.subsection}
          aria-labelledby="modifiers-title"
        >
          <div className={styles.subsectionHeader}>
            <span className={styles.step}>02</span>
            <div>
              <h3 id="modifiers-title">Optical modifiers</h3>
              <p>Build the ordered reducer, flattener, or Barlow chain.</p>
            </div>
          </div>

          <Combobox
            description="Search verified modifiers. A used preset is disabled to prevent accidental duplicates."
            disabled={catalogueUnavailable || modifierLimitReached}
            id="modifier-preset"
            label="Modifier preset"
            name="modifier-preset"
            noResultsText="No matching modifier presets"
            onQueryChange={setModifierQuery}
            onSelectionChange={setModifierSelection}
            options={modifierOptions}
            query={modifierQuery}
            selectedValue={modifierSelection}
          />

          <div className={styles.buttonRow}>
            <button
              className={styles.secondaryButton}
              disabled={!modifierSelection || modifierLimitReached}
              onClick={addSelectedModifier}
              type="button"
            >
              Add selected modifier
            </button>
            <button
              className={styles.secondaryButton}
              disabled={modifierLimitReached}
              id="add-manual-modifier"
              onClick={() =>
                dispatch({
                  type: "modifier-add",
                  modifier: manualModifier(createModifierId()),
                })
              }
              ref={addManualModifierRef}
              type="button"
            >
              Add manual modifier
            </button>
          </div>

          {state.modifiers.length > 0 ? (
            <ol
              className={styles.modifierList}
              aria-label="Optical modifier chain"
            >
              {state.modifiers.map((modifier, index) => (
                <li className={styles.modifier} key={modifier.instanceId}>
                  <div className={styles.modifierHeader}>
                    <div>
                      <span className={styles.modifierOrder}>
                        Path {index + 1}
                      </span>
                      <h4>{modifier.label}</h4>
                    </div>
                    <button
                      aria-label={"Remove " + modifier.label}
                      className={styles.removeButton}
                      onClick={() => removeModifier(modifier.instanceId, index)}
                      ref={(element) => {
                        if (element) {
                          modifierRemoveRefs.current.set(
                            modifier.instanceId,
                            element,
                          );
                        } else {
                          modifierRemoveRefs.current.delete(
                            modifier.instanceId,
                          );
                        }
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <p className={styles.status}>
                    {modifier.source === "manual"
                      ? "Manual " + readableModifierType(modifier.modifierType)
                      : modifierIsCustomised(modifier)
                        ? "Customised preset"
                        : "Catalogue " + modifier.modifierType}
                  </p>
                  {modifier.source === "manual" ? (
                    <SegmentedControl<ManualModifierType>
                      description="Identify how this manually entered factor is used in the optical path."
                      id={modifier.instanceId + "-type"}
                      label="Modifier type"
                      name={modifier.instanceId + "-type"}
                      onValueChange={(modifierType) =>
                        dispatch({
                          type: "modifier-type",
                          instanceId: modifier.instanceId,
                          modifierType,
                        })
                      }
                      options={MANUAL_MODIFIER_TYPE_OPTIONS}
                      value={modifier.modifierType as ManualModifierType}
                    />
                  ) : null}
                  <NumericInput
                    description="Dimensionless factor applied at this point in the optical path."
                    error={numericError(
                      modifier.multiplier,
                      0.1,
                      10,
                      "Enter a multiplier from 0.1× to 10×.",
                    )}
                    id={modifier.instanceId + "-multiplier"}
                    label="Magnification factor"
                    max={10}
                    min={0.1}
                    name={modifier.instanceId + "-multiplier"}
                    onValueChange={(value) =>
                      dispatch({
                        type: "modifier-multiplier",
                        instanceId: modifier.instanceId,
                        value,
                      })
                    }
                    required
                    step="any"
                    unit="×"
                    unitLabel="times"
                    value={modifier.multiplier}
                  />
                  <p className={styles.compatibility}>
                    {focalRatioEffect(modifier)}
                  </p>
                  {modifier.baselineMultiplier !== null ? (
                    <button
                      className={styles.secondaryButton}
                      disabled={!modifierIsCustomised(modifier)}
                      onClick={() =>
                        dispatch({
                          type: "modifier-reset",
                          instanceId: modifier.instanceId,
                        })
                      }
                      type="button"
                    >
                      Restore {modifier.label} multiplier
                    </button>
                  ) : null}
                  {modifier.compatibleNotes ? (
                    <p className={styles.compatibility}>
                      Compatibility: {modifier.compatibleNotes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.emptyState}>No optical modifiers applied.</p>
          )}

          {state.modifiers.length > 1 ? (
            <button
              className={styles.textButton}
              onClick={clearModifiers}
              type="button"
            >
              Clear modifier chain
            </button>
          ) : null}
          {modifierLimitReached ? (
            <p className={styles.limitMessage}>
              The optical path is limited to {MAX_OPTICAL_MODIFIERS} modifiers.
            </p>
          ) : null}
        </section>

        <section className={styles.subsection} aria-labelledby="camera-title">
          <div className={styles.subsectionHeader}>
            <span className={styles.step}>03</span>
            <div>
              <h3 id="camera-title">Camera</h3>
              <p>Use physical sensor dimensions or derive them from pixels.</p>
            </div>
          </div>

          <SegmentedControl<EquipmentMode>
            description="Manual mode preserves all current sensor values."
            id="camera-mode"
            label="Camera source"
            name="camera-mode"
            onValueChange={(mode) => dispatch({ type: "camera-mode", mode })}
            options={EQUIPMENT_MODE_OPTIONS.map((option) => ({
              ...option,
              disabled:
                option.value === "preset" &&
                (!state.camera.lastPreset || catalogueUnavailable),
            }))}
            value={state.camera.mode}
          />

          <Combobox
            description="Search by manufacturer or model; choosing a result populates all known sensor values."
            disabled={state.camera.mode === "manual" || catalogueUnavailable}
            error={
              state.camera.mode === "preset" && !cameraSelection
                ? "Choose a camera preset or switch to Manual. Current values are unchanged."
                : undefined
            }
            id="camera-preset"
            label="Camera preset"
            name="camera-preset"
            noResultsText="No matching camera presets"
            onQueryChange={setCameraQuery}
            onSelectionChange={selectCamera}
            options={cameraOptions}
            query={cameraQuery}
            required={state.camera.mode === "preset"}
            selectedValue={cameraSelection}
          />

          <p className={styles.status} data-testid="camera-status">
            {equipmentStatus(
              state.camera.mode,
              state.camera.lastPreset?.label,
              cameraCustomised,
            )}
          </p>

          {cameraPreset ? (
            <div className={styles.presetDetail}>
              <p>
                {cameraPreset.sensorName} · {cameraPreset.resolutionWidthPx} ×{" "}
                {cameraPreset.resolutionHeightPx} px · {cameraPreset.sensorType}{" "}
                {cameraPreset.colourMode}
              </p>
              <p className={styles.provenance}>
                Verified{" "}
                <time dateTime={cameraPreset.verifiedAt}>
                  {cameraPreset.verifiedAt.slice(0, 10)}
                </time>
                . <a href={cameraPreset.sourceUrl}>Source specification</a>.
              </p>
            </div>
          ) : null}

          <SegmentedControl<SensorGeometryMode>
            description="Choose which unrounded values determine physical sensor size."
            id="sensor-geometry-mode"
            label="Sensor size source"
            name="sensor-geometry-mode"
            onValueChange={(mode) =>
              dispatch({ type: "camera-geometry-mode", mode })
            }
            options={SENSOR_GEOMETRY_OPTIONS}
            value={state.camera.geometryMode}
          />

          {state.camera.geometryMode === "physical-dimensions" ? (
            <div className={styles.inputPair}>
              <NumericInput
                error={numericError(
                  state.camera.sensorWidthMm,
                  0.1,
                  1_000,
                  "Enter a sensor width from 0.1 to 1,000 mm.",
                )}
                id="sensor-width"
                label="Sensor width"
                max={1_000}
                min={0.1}
                name="sensor-width"
                onValueChange={(value) =>
                  dispatch({
                    type: "camera-field",
                    field: "sensorWidthMm",
                    value,
                  })
                }
                required
                step="any"
                unit="mm"
                unitLabel="millimetres"
                value={state.camera.sensorWidthMm}
              />
              <NumericInput
                error={numericError(
                  state.camera.sensorHeightMm,
                  0.1,
                  1_000,
                  "Enter a sensor height from 0.1 to 1,000 mm.",
                )}
                id="sensor-height"
                label="Sensor height"
                max={1_000}
                min={0.1}
                name="sensor-height"
                onValueChange={(value) =>
                  dispatch({
                    type: "camera-field",
                    field: "sensorHeightMm",
                    value,
                  })
                }
                required
                step="any"
                unit="mm"
                unitLabel="millimetres"
                value={state.camera.sensorHeightMm}
              />
            </div>
          ) : (
            <div className={styles.inputPair}>
              <NumericInput
                error={numericError(
                  state.camera.resolutionWidthPx,
                  1,
                  200_000,
                  "Enter an integer width from 1 to 200,000 pixels.",
                  true,
                )}
                id="resolution-width"
                label="Resolution width"
                max={200_000}
                min={1}
                name="resolution-width"
                onValueChange={(value) =>
                  dispatch({
                    type: "camera-field",
                    field: "resolutionWidthPx",
                    value,
                  })
                }
                required
                step={1}
                unit="px"
                unitLabel="pixels"
                value={state.camera.resolutionWidthPx}
              />
              <NumericInput
                error={numericError(
                  state.camera.resolutionHeightPx,
                  1,
                  200_000,
                  "Enter an integer height from 1 to 200,000 pixels.",
                  true,
                )}
                id="resolution-height"
                label="Resolution height"
                max={200_000}
                min={1}
                name="resolution-height"
                onValueChange={(value) =>
                  dispatch({
                    type: "camera-field",
                    field: "resolutionHeightPx",
                    value,
                  })
                }
                required
                step={1}
                unit="px"
                unitLabel="pixels"
                value={state.camera.resolutionHeightPx}
              />
            </div>
          )}

          <NumericInput
            description="Native pixel pitch before any binning or resampling."
            error={numericError(
              state.camera.pixelSizeUm,
              0.1,
              100,
              "Enter a pixel pitch from 0.1 to 100 micrometres.",
            )}
            id="pixel-size"
            label="Native pixel pitch"
            max={100}
            min={0.1}
            name="pixel-size"
            onValueChange={(value) =>
              dispatch({
                type: "camera-field",
                field: "pixelSizeUm",
                value,
              })
            }
            required
            step="any"
            unit="µm"
            unitLabel="micrometres"
            value={state.camera.pixelSizeUm}
          />

          <button
            className={styles.secondaryButton}
            disabled={!state.camera.lastPreset}
            onClick={() => {
              dispatch({ type: "camera-reset" });
              if (cameraPreset) {
                setCameraSelection(cameraPreset.slug);
                setCameraQuery(cameraLabel(cameraPreset));
              }
            }}
            type="button"
          >
            {state.camera.lastPreset
              ? "Restore " + state.camera.lastPreset.label + " preset"
              : "No camera preset to restore"}
          </button>
        </section>

        <section
          className={styles.subsection}
          aria-labelledby="conditions-title"
        >
          <div className={styles.subsectionHeader}>
            <span className={styles.step}>04</span>
            <div>
              <h3 id="conditions-title">Capture conditions</h3>
              <p>Describe effective pixels and the seeing at your site.</p>
            </div>
          </div>

          <SegmentedControl<BinningValue>
            description="Hardware binning combines charge before readout on supported sensors; software resampling changes interpretation but not captured photons."
            id="binning"
            label="Binning or effective pixel grouping"
            name="binning"
            onValueChange={(value) => dispatch({ type: "binning", value })}
            options={BINNING_OPTIONS}
            value={state.binning}
          />
          <RangeInput
            description="An estimate of atmospheric stellar FWHM at your site."
            id="seeing"
            label="Seeing"
            max={10}
            min={0.5}
            name="seeing"
            onValueChange={(value) => dispatch({ type: "seeing", value })}
            step={0.1}
            value={state.seeingFwhmArcsec}
            valueText={state.seeingFwhmArcsec.toFixed(1) + " arcseconds"}
          />
        </section>

        <section className={styles.subsection} aria-labelledby="target-title">
          <div className={styles.subsectionHeader}>
            <span className={styles.step}>05</span>
            <div>
              <h3 id="target-title">Target</h3>
              <p>
                Choose the object that the proportional simulator will frame.
              </p>
            </div>
          </div>
          <Combobox
            description="The selected target is drawn from its catalogue angular dimensions in the framing workspace."
            disabled={catalogueUnavailable}
            error={
              state.targetSlug && !targetSelection
                ? "Choose a target preset. The previous target remains active until then."
                : undefined
            }
            id="target-preset"
            label="Astronomical target"
            name="target-preset"
            noResultsText="No matching target presets"
            onQueryChange={setTargetQuery}
            onSelectionChange={(value) => {
              setTargetSelection(value);
              if (value) {
                dispatch({ type: "target", slug: value });
              }
            }}
            options={targetOptions}
            query={targetQuery}
            selectedValue={targetSelection}
          />
        </section>
      </div>
    </section>
  );
}
