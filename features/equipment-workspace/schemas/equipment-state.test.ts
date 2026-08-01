import { describe, expect, it } from "vitest";
import { createEquipmentConfiguration } from "@/features/field-of-view/model/equipment-configuration";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import {
  equipmentUrl,
  normaliseEquipmentPageSearchParams,
  parseEquipmentState,
  serializeEquipmentState,
} from "./equipment-state";

describe("equipment workspace URL state", () => {
  it("serialises only portable equipment fields and round-trips them", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const params = serializeEquipmentState(state);
    expect(params).not.toBeNull();
    expect(params?.get("t")).toBe("evostar-80edx-apo-refractor");
    expect(params?.has("target")).toBe(false);
    expect(params?.has("s")).toBe(false);
    expect(params?.has("zoom")).toBe(false);
    const parsed = parseEquipmentState(
      params ?? new URLSearchParams(),
      fieldOfViewCatalogueFixture,
    );
    expect(parsed.notice).toBeNull();
    expect(parsed.state.telescope).toEqual(state.telescope);
    expect(parsed.state.camera).toEqual(state.camera);
    expect(parsed.state.modifiers).toEqual(state.modifiers);
    expect(parsed.state.binning).toBe(state.binning);
  });

  it("bounds and removes calculator-specific raw parameters", () => {
    const params = normaliseEquipmentPageSearchParams({
      v: "1",
      f: "600",
      target: "m31-andromeda-galaxy",
      zoom: "4",
      unknown: "ignored",
    });
    expect(params.toString()).toBe("v=1&f=600");
  });

  it("builds a canonical bookmarkable URL", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const url = equipmentUrl("https://astrotools.test", state);
    expect(url?.pathname).toBe("/equipment");
    expect(url?.searchParams.get("c")).toBe("asi2600mc-pro");
  });
});
