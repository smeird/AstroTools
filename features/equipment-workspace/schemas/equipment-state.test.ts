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
    const url = equipmentUrl("https://astrotools.test", state, "Garden Rig", {
      bortleClass: "4",
      skyQualityMagArcsec2: "20.85",
    });
    expect(url?.pathname).toBe("/equipment");
    expect(url?.searchParams.get("c")).toBe("asi2600mc-pro");
    expect(url?.searchParams.get("n")).toBe("Garden Rig");
    expect(url?.searchParams.get("bo")).toBe("4");
    expect(url?.searchParams.get("sqm")).toBe("20.85");
    const parsed = parseEquipmentState(
      url?.searchParams ?? new URLSearchParams(),
      fieldOfViewCatalogueFixture,
    );
    expect(parsed.rigName).toBe("Garden Rig");
    expect(parsed.site).toEqual({
      bortleClass: "4",
      skyQualityMagArcsec2: "20.85",
    });
  });

  it("normalises and bounds bookmark names", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const params = serializeEquipmentState(
      state,
      `  Observatory\n${"x".repeat(100)}  `,
    );
    expect(params?.get("n")).toHaveLength(80);
    expect(params?.get("n")).toMatch(/^Observatory x+$/);
  });

  it("drops invalid observing-site measurements without defaults", () => {
    const parsed = parseEquipmentState(
      new URLSearchParams("v=1&bo=10&sqm=30"),
      fieldOfViewCatalogueFixture,
    );
    expect(parsed.site).toEqual({
      bortleClass: "",
      skyQualityMagArcsec2: "",
    });
  });
});
