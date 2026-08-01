import { describe, expect, it } from "vitest";

import {
  cameraSelectionFromConfiguration,
  imagingTrainFromConfiguration,
  parseSharedImagingTrain,
  serializeSharedImagingTrain,
  parseSharedCameraSelection,
  serializeSharedCameraSelection,
  applySharedTelescopeWhenChanged,
  parseSharedTelescopeSelection,
  serializeSharedTelescopeSelection,
  type SharedTelescopeSelection,
} from "./telescope-selection";
import { createEquipmentConfiguration } from "@/features/field-of-view/model/equipment-configuration";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";

const telescope: SharedTelescopeSelection = {
  version: 1,
  slug: "edgehd-8",
  label: "Celestron EdgeHD 8",
  nativeFocalLengthMm: "2032",
  apertureMm: "203.2",
};

describe("shared telescope selection", () => {
  it("creates a portable camera selection from equipment state", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const camera = cameraSelectionFromConfiguration(state.camera);
    expect(camera).toMatchObject({
      slug: "asi2600mc-pro",
      sensorWidthMm: "23.5",
      sensorHeightMm: "15.7",
      pixelSizeUm: "3.76",
    });
    expect(
      parseSharedCameraSelection(serializeSharedCameraSelection(camera!)),
    ).toEqual(camera);
  });

  it("captures the complete effective imaging train", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const train = imagingTrainFromConfiguration(
      {
        ...state,
        modifiers: [
          {
            instanceId: "test",
            source: "manual",
            presetSlug: null,
            label: "0.7× reducer",
            modifierType: "Reducer",
            multiplier: "0.7",
            baselineMultiplier: null,
            compatibleNotes: null,
          },
        ],
        binning: "2",
      },
      "Garden Rig",
      { bortleClass: "4", skyQualityMagArcsec2: "20.85" },
    );
    expect(train).toMatchObject({
      rigName: "Garden Rig",
      nativeFocalLengthMm: "600",
      effectiveFocalLengthMm: "420",
      opticalMultiplier: "0.7",
      pixelSizeUm: "3.76",
      binningFactor: "2",
      bortleClass: "4",
      skyQualityMagArcsec2: "20.85",
    });
    expect(
      parseSharedImagingTrain(serializeSharedImagingTrain(train!)),
    ).toEqual(train);
    expect(
      parseSharedImagingTrain(
        JSON.stringify({ ...train, rigName: "x".repeat(81) }),
      ),
    ).toBeNull();
    expect(
      parseSharedImagingTrain(
        JSON.stringify({ ...train, skyQualityMagArcsec2: "30" }),
      ),
    ).toBeNull();
  });

  it("round-trips a bounded versioned selection", () => {
    expect(
      parseSharedTelescopeSelection(
        serializeSharedTelescopeSelection(telescope),
      ),
    ).toEqual(telescope);
  });

  it("applies a newly selected telescope once without replacing other values", () => {
    const initial = { focalLengthMm: "1000", seeing: "2" };
    const first = applySharedTelescopeWhenChanged(
      initial,
      telescope,
      null,
      (values, selected) => ({
        ...values,
        focalLengthMm: selected.nativeFocalLengthMm,
      }),
    );
    expect(first.values).toEqual({ focalLengthMm: "2032", seeing: "2" });
    expect(first.changed).toBe(true);

    const manuallyEdited = { ...first.values, focalLengthMm: "1800" };
    const second = applySharedTelescopeWhenChanged(
      manuallyEdited,
      telescope,
      first.appliedSelection,
      (values, selected) => ({
        ...values,
        focalLengthMm: selected.nativeFocalLengthMm,
      }),
    );
    expect(second.values.focalLengthMm).toBe("1800");
    expect(second.changed).toBe(false);
  });

  it("rejects malformed or non-positive dimensions", () => {
    expect(parseSharedTelescopeSelection("{}" as string)).toBeNull();
    expect(
      parseSharedTelescopeSelection(
        JSON.stringify({ ...telescope, apertureMm: "0" }),
      ),
    ).toBeNull();
  });
});
