import { describe, expect, it } from "vitest";

import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import {
  MAX_OPTICAL_MODIFIERS,
  cameraIsCustomised,
  createEquipmentConfiguration,
  equipmentConfigurationReducer,
  manualModifier,
  modifierChangesEffectiveFocalRatio,
  modifierFromPreset,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
  telescopeIsCustomised,
} from "./equipment-configuration";

describe("equipment configuration", () => {
  it("starts with the preferred catalogue presets and direct focal length", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);

    expect(state.telescope).toMatchObject({
      mode: "preset",
      focalLengthMode: "direct",
      nativeFocalLengthMm: "600",
      apertureMm: "80",
    });
    expect(state.camera).toMatchObject({
      mode: "preset",
      geometryMode: "physical-dimensions",
      sensorWidthMm: "23.5",
      sensorHeightMm: "15.7",
    });
    expect(state.targetSlug).toBe("m31-andromeda-galaxy");
    expect(state.framing).toEqual({
      displayZoom: 1,
      frameRotationDeg: 0,
      sensorOrientation: "landscape",
    });
  });

  it("bounds framing controls independently from the optical configuration", () => {
    const initial = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const originalTelescope = initial.telescope;
    let state = equipmentConfigurationReducer(initial, {
      type: "framing-display-zoom",
      value: 99,
    });
    state = equipmentConfigurationReducer(state, {
      type: "framing-rotation",
      value: -999,
    });
    state = equipmentConfigurationReducer(state, {
      type: "framing-orientation",
      value: "portrait",
    });

    expect(state.framing).toEqual({
      displayZoom: 4,
      frameRotationDeg: -180,
      sensorOrientation: "portrait",
    });
    expect(state.telescope).toBe(originalTelescope);
  });

  it("preserves values in manual mode and resets to the last selected telescope", () => {
    const initial = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const edge = fieldOfViewCatalogueFixture.telescopes[0];
    expect(edge).toBeDefined();
    let state = equipmentConfigurationReducer(initial, {
      type: "telescope-preset",
      preset: edge!,
    });

    state = equipmentConfigurationReducer(state, {
      type: "telescope-mode",
      mode: "manual",
    });
    state = equipmentConfigurationReducer(state, {
      type: "telescope-field",
      field: "nativeFocalLengthMm",
      value: "1800",
    });

    expect(state.telescope.mode).toBe("manual");
    expect(state.telescope.nativeFocalLengthMm).toBe("1800");
    expect(telescopeIsCustomised(state.telescope)).toBe(true);

    state = equipmentConfigurationReducer(state, { type: "telescope-reset" });

    expect(state.telescope).toMatchObject({
      mode: "preset",
      focalLengthMode: "direct",
      nativeFocalLengthMm: "2032",
      apertureMm: "203.2",
    });
  });

  it("compares canonical numeric values when marking a preset customised", () => {
    let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);

    state = equipmentConfigurationReducer(state, {
      type: "telescope-field",
      field: "nativeFocalLengthMm",
      value: "600.0",
    });
    expect(telescopeIsCustomised(state.telescope)).toBe(false);

    state = equipmentConfigurationReducer(state, {
      type: "telescope-field",
      field: "nativeFocalLengthMm",
      value: "610",
    });
    expect(telescopeIsCustomised(state.telescope)).toBe(true);
  });

  it("keeps aperture independent in direct mode and couples it only after explicit derivation", () => {
    let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const directBefore = resolveTelescopeInputs(state.telescope);

    state = equipmentConfigurationReducer(state, {
      type: "telescope-field",
      field: "apertureMm",
      value: "100",
    });
    expect(resolveTelescopeInputs(state.telescope).nativeFocalLengthMm).toBe(
      directBefore.nativeFocalLengthMm,
    );

    state = equipmentConfigurationReducer(state, {
      type: "telescope-focal-mode",
      mode: "derived",
    });
    state = equipmentConfigurationReducer(state, {
      type: "telescope-field",
      field: "apertureMm",
      value: "120",
    });

    expect(resolveTelescopeInputs(state.telescope)).toMatchObject({
      apertureMm: 120,
      focalRatio: 6,
      nativeFocalLengthMm: 720,
    });
  });

  it("keeps every valid direct focal ratio valid when derived mode is selected", () => {
    for (const example of [
      { apertureMm: "5", focalLengthMm: "20000", focalRatio: 4_000 },
      { apertureMm: "2000", focalLengthMm: "10", focalRatio: 0.005 },
    ]) {
      let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
      state = equipmentConfigurationReducer(state, {
        type: "telescope-field",
        field: "nativeFocalLengthMm",
        value: example.focalLengthMm,
      });
      state = equipmentConfigurationReducer(state, {
        type: "telescope-field",
        field: "apertureMm",
        value: example.apertureMm,
      });
      state = equipmentConfigurationReducer(state, {
        type: "telescope-focal-mode",
        mode: "derived",
      });

      expect(resolveTelescopeInputs(state.telescope)).toMatchObject({
        apertureMm: Number(example.apertureMm),
        focalRatio: example.focalRatio,
        nativeFocalLengthMm: Number(example.focalLengthMm),
      });
    }
  });

  it("preserves camera values in manual mode and restores the latest preset", () => {
    let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const squareCamera = fieldOfViewCatalogueFixture.cameras[1];
    expect(squareCamera).toBeDefined();

    state = equipmentConfigurationReducer(state, {
      type: "camera-preset",
      preset: squareCamera!,
    });
    state = equipmentConfigurationReducer(state, {
      type: "camera-mode",
      mode: "manual",
    });
    state = equipmentConfigurationReducer(state, {
      type: "camera-field",
      field: "sensorWidthMm",
      value: "12",
    });

    expect(state.camera.sensorWidthMm).toBe("12");
    expect(cameraIsCustomised(state.camera)).toBe(true);

    state = equipmentConfigurationReducer(state, { type: "camera-reset" });
    expect(state.camera).toMatchObject({
      mode: "preset",
      sensorWidthMm: "11.31",
      sensorHeightMm: "11.31",
    });
  });

  it("resolves both physical and pixel-derived camera geometry", () => {
    let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    expect(resolveCameraSensor(state.camera)).toMatchObject({
      geometry: { source: "physical-dimensions", widthMm: 23.5 },
    });

    state = equipmentConfigurationReducer(state, {
      type: "camera-geometry-mode",
      mode: "pixel-resolution",
    });
    expect(cameraIsCustomised(state.camera)).toBe(true);
    expect(resolveCameraSensor(state.camera)).toMatchObject({
      geometry: {
        source: "pixel-resolution",
        resolutionWidthPx: 6248,
        resolutionHeightPx: 4176,
      },
      nativePixelSizeUm: 3.76,
    });
  });

  it("keeps an ordered bounded modifier chain and validates every factor", () => {
    let state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const preset = fieldOfViewCatalogueFixture.opticalModifiers[0];
    expect(preset).toBeDefined();

    state = equipmentConfigurationReducer(state, {
      type: "modifier-add",
      modifier: modifierFromPreset(preset!, "preset-1"),
    });
    state = equipmentConfigurationReducer(state, {
      type: "modifier-add",
      modifier: manualModifier("manual-1"),
    });
    expect(resolveModifierMultipliers(state.modifiers)).toEqual([0.7, 1]);
    expect(modifierChangesEffectiveFocalRatio(state.modifiers[0]!)).toBe(true);
    expect(modifierChangesEffectiveFocalRatio(state.modifiers[1]!)).toBe(false);

    state = equipmentConfigurationReducer(state, {
      type: "modifier-type",
      instanceId: "manual-1",
      modifierType: "barlow",
    });
    expect(state.modifiers[1]?.modifierType).toBe("barlow");

    state = equipmentConfigurationReducer(state, {
      type: "modifier-multiplier",
      instanceId: "manual-1",
      value: "0",
    });
    expect(resolveModifierMultipliers(state.modifiers)).toBeNull();
    expect(modifierChangesEffectiveFocalRatio(state.modifiers[1]!)).toBeNull();

    state = equipmentConfigurationReducer(state, {
      type: "modifier-multiplier",
      instanceId: "preset-1",
      value: "0.8",
    });
    state = equipmentConfigurationReducer(state, {
      type: "modifier-reset",
      instanceId: "preset-1",
    });
    expect(state.modifiers[0]?.multiplier).toBe("0.7");

    for (let index = 2; index <= MAX_OPTICAL_MODIFIERS + 2; index += 1) {
      state = equipmentConfigurationReducer(state, {
        type: "modifier-add",
        modifier: manualModifier(`manual-${index}`),
      });
    }
    expect(state.modifiers).toHaveLength(MAX_OPTICAL_MODIFIERS);
  });
});
