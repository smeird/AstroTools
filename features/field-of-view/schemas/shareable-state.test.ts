import { describe, expect, it } from "vitest";

import {
  COMPLEX_FIELD_OF_VIEW_SHARE_V1,
  DEFAULT_FIELD_OF_VIEW_SHARE_V1,
  MANUAL_DERIVED_FIELD_OF_VIEW_SHARE_V1,
} from "@/tests/fixtures/field-of-view-shareable-state-v1";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import {
  cameraFromPreset,
  createEquipmentConfiguration,
  modifierFromPreset,
  telescopeFromPreset,
} from "../model/equipment-configuration";
import {
  MAX_SHARE_MODIFIER_PARAMETER_LENGTH,
  MAX_SHARE_PARAMETER_LENGTH,
  MAX_SHARE_QUERY_LENGTH,
  extractFieldOfViewShareReferences,
  normaliseFieldOfViewPageSearchParams,
  parseFieldOfViewShareState,
  serializeFieldOfViewShareState,
} from "./shareable-state";

describe("field-of-view shareable state v1", () => {
  it("keeps the bare calculator route on defaults without a notice", () => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed).toEqual({
      state: createEquipmentConfiguration(fieldOfViewCatalogueFixture),
      notice: null,
    });
  });

  it("keeps the manually authored default fixture stable", () => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(DEFAULT_FIELD_OF_VIEW_SHARE_V1),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.notice).toBeNull();
    expect(serializeFieldOfViewShareState(parsed.state)?.toString()).toBe(
      DEFAULT_FIELD_OF_VIEW_SHARE_V1,
    );
  });

  it("restores customised presets, ordered modifiers, and every display field", () => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(COMPLEX_FIELD_OF_VIEW_SHARE_V1),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.notice).toBeNull();
    expect(parsed.state).toMatchObject({
      telescope: {
        mode: "manual",
        focalLengthMode: "direct",
        nativeFocalLengthMm: "1800",
        apertureMm: "203.2",
        lastPreset: { slug: "edgehd-8-optical-tube-assembly" },
      },
      camera: {
        mode: "preset",
        geometryMode: "pixel-resolution",
        lastPreset: { slug: "asi533mc-pro" },
      },
      binning: "2",
      seeingFwhmArcsec: 1.8,
      targetSlug: "m42-orion-nebula",
      physicalDisplayUnit: "inches",
      framing: {
        displayZoom: 2.5,
        frameRotationDeg: 35,
        sensorOrientation: "portrait",
      },
    });
    expect(parsed.state.modifiers).toMatchObject([
      {
        instanceId: "url-modifier-1",
        source: "preset",
        presetSlug: "reducer-lens-0-7x-edgehd-800",
        multiplier: "0.72",
      },
      {
        instanceId: "url-modifier-2",
        source: "manual",
        presetSlug: null,
        modifierType: "barlow",
        multiplier: "2",
      },
    ]);
    expect(serializeFieldOfViewShareState(parsed.state)?.toString()).toBe(
      COMPLEX_FIELD_OF_VIEW_SHARE_V1,
    );
  });

  it("restores a fully manual derived and pixel-resolution configuration", () => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(MANUAL_DERIVED_FIELD_OF_VIEW_SHARE_V1),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.notice).toBeNull();
    expect(parsed.state.telescope).toMatchObject({
      mode: "manual",
      focalLengthMode: "derived",
      apertureMm: "100",
      focalRatio: "7",
      lastPreset: null,
    });
    expect(parsed.state.camera).toMatchObject({
      mode: "manual",
      geometryMode: "pixel-resolution",
      pixelSizeUm: "4.8",
      resolutionWidthPx: "4000",
      resolutionHeightPx: "3000",
      lastPreset: null,
    });
    expect(serializeFieldOfViewShareState(parsed.state)?.toString()).toBe(
      MANUAL_DERIVED_FIELD_OF_VIEW_SHARE_V1,
    );
  });

  it("ignores unknown future and privacy-sensitive parameters", () => {
    const searchParams = new URLSearchParams(DEFAULT_FIELD_OF_VIEW_SHARE_V1);
    searchParams.set("future", "enabled");
    searchParams.set("email", "person@example.test");
    searchParams.set("token", "do-not-copy");

    const parsed = parseFieldOfViewShareState(
      searchParams,
      fieldOfViewCatalogueFixture,
    );
    const canonical = serializeFieldOfViewShareState(parsed.state)?.toString();

    expect(parsed.notice).toBeNull();
    expect(canonical).toBe(DEFAULT_FIELD_OF_VIEW_SHARE_V1);
    expect(canonical).not.toContain("person");
    expect(canonical).not.toContain("token");
  });

  it.each([
    ["missing", "f=900"],
    ["unsupported", "v=2&f=900"],
    ["duplicate", "v=1&v=1&f=900"],
  ])("restores all defaults for a %s version", (_case, query) => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(query),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.state).toEqual(
      createEquipmentConfiguration(fieldOfViewCatalogueFixture),
    );
    expect(parsed.notice).toEqual({ kind: "unsupported-version" });
  });

  it("falls back only malformed recognised settings and never reflects values", () => {
    const maliciousValue = "<img src=x onerror=alert(1)>";
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(
        `v=1&f=${encodeURIComponent(maliciousValue)}&s=99&zoom=NaN&target=m42-orion-nebula`,
      ),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.state.telescope.nativeFocalLengthMm).toBe("600");
    expect(parsed.state.seeingFwhmArcsec).toBe(2);
    expect(parsed.state.framing.displayZoom).toBe(1);
    expect(parsed.state.targetSlug).toBe("m42-orion-nebula");
    expect(parsed.notice).toEqual({
      kind: "invalid-settings",
      settings: ["native focal length", "seeing", "display zoom"],
    });
    expect(JSON.stringify(parsed.notice)).not.toContain(maliciousValue);
  });

  it("rejects scalar parameter pollution but permits at most eight ordered modifiers", () => {
    const searchParams = new URLSearchParams(
      "v=1&b=2&b=4&" +
        Array.from(
          { length: 10 },
          (_, index) => `m=manual%3Amanual%3Acustom%3A${index + 1}`,
        ).join("&"),
    );

    const parsed = parseFieldOfViewShareState(
      searchParams,
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.state.binning).toBe("1");
    expect(parsed.state.modifiers).toHaveLength(8);
    expect(parsed.notice).toMatchObject({ kind: "invalid-settings" });
  });

  it("refuses to serialise more modifiers than the URL schema permits", () => {
    const state = {
      ...createEquipmentConfiguration(fieldOfViewCatalogueFixture),
      modifiers: Array.from({ length: 9 }, (_, index) => ({
        instanceId: `modifier-${index + 1}`,
        source: "manual" as const,
        presetSlug: null,
        modifierType: "custom" as const,
        label: `Modifier ${index + 1}`,
        multiplier: "1",
        baselineMultiplier: null,
        compatibleNotes: null,
      })),
    };

    expect(serializeFieldOfViewShareState(state)).toBeNull();
  });

  it("round-trips a maximum-length preset slug through page normalization", () => {
    const maximumSlug = "a".repeat(MAX_SHARE_PARAMETER_LENGTH);
    const modifier = {
      ...fieldOfViewCatalogueFixture.opticalModifiers[0]!,
      slug: maximumSlug,
      modifierType: "field-flattener",
    };
    const catalogue = {
      ...fieldOfViewCatalogueFixture,
      opticalModifiers: [modifier],
    };
    const baseState = createEquipmentConfiguration(catalogue);
    const state = {
      ...baseState,
      modifiers: [modifierFromPreset(modifier, "modifier-maximum-slug")],
    };
    const serialized = serializeFieldOfViewShareState(state);

    expect(serialized).not.toBeNull();
    expect(serialized?.get("m")?.length).toBeLessThanOrEqual(
      MAX_SHARE_MODIFIER_PARAMETER_LENGTH,
    );
    expect(serialized?.get("m")?.length).toBeGreaterThan(
      MAX_SHARE_PARAMETER_LENGTH,
    );

    const normalized = normaliseFieldOfViewPageSearchParams(
      Object.fromEntries(serialized ?? []),
    );
    const parsed = parseFieldOfViewShareState(normalized, catalogue);

    expect(parsed.notice).toBeNull();
    expect(parsed.state.modifiers[0]?.presetSlug).toBe(maximumSlug);
    expect(serializeFieldOfViewShareState(parsed.state)?.toString()).toBe(
      serialized?.toString(),
    );
  });

  it("keeps a real catalogue slug named manual distinct from manual entry", () => {
    const telescope = {
      ...fieldOfViewCatalogueFixture.telescopes[0]!,
      slug: "manual",
    };
    const camera = {
      ...fieldOfViewCatalogueFixture.cameras[0]!,
      slug: "manual",
    };
    const catalogue = {
      ...fieldOfViewCatalogueFixture,
      telescopes: [telescope],
      cameras: [camera],
    };
    const baseState = createEquipmentConfiguration(catalogue);
    const serialized = serializeFieldOfViewShareState({
      ...baseState,
      telescope: telescopeFromPreset(telescope),
      camera: cameraFromPreset(camera),
    });

    expect(serialized?.get("t")).toBe("manual");
    expect(serialized?.get("c")).toBe("manual");

    const parsed = parseFieldOfViewShareState(serialized!, catalogue);
    expect(parsed.notice).toBeNull();
    expect(parsed.state.telescope.lastPreset?.slug).toBe("manual");
    expect(parsed.state.camera.lastPreset?.slug).toBe("manual");
  });

  it("uses active safe defaults when polluted references supplement inactive preferred records", () => {
    const inactivePreferredTelescope = {
      ...fieldOfViewCatalogueFixture.telescopes[1]!,
      active: false,
    };
    const inactivePreferredCamera = {
      ...fieldOfViewCatalogueFixture.cameras[0]!,
      active: false,
    };
    const catalogue = {
      ...fieldOfViewCatalogueFixture,
      telescopes: [
        fieldOfViewCatalogueFixture.telescopes[0]!,
        inactivePreferredTelescope,
      ],
      cameras: [
        fieldOfViewCatalogueFixture.cameras[1]!,
        inactivePreferredCamera,
      ],
    };
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(
        `v=1&t=${inactivePreferredTelescope.slug}&t=${inactivePreferredTelescope.slug}&c=${inactivePreferredCamera.slug}&c=${inactivePreferredCamera.slug}`,
      ),
      catalogue,
    );

    expect(parsed.state.telescope.lastPreset?.slug).toBe(
      fieldOfViewCatalogueFixture.telescopes[0]!.slug,
    );
    expect(parsed.state.camera.lastPreset?.slug).toBe(
      fieldOfViewCatalogueFixture.cameras[1]!.slug,
    );
    expect(parsed.state.telescope.lastPreset?.label).not.toContain("inactive");
    expect(parsed.state.camera.lastPreset?.label).not.toContain("inactive");
  });

  it("round-trips repository-governed preset modifier types", () => {
    const modifier = {
      ...fieldOfViewCatalogueFixture.opticalModifiers[0]!,
      slug: "future-coma-corrector",
      modifierType: "coma-corrector",
    };
    const catalogue = {
      ...fieldOfViewCatalogueFixture,
      opticalModifiers: [modifier],
    };
    const baseState = createEquipmentConfiguration(catalogue);
    const serialized = serializeFieldOfViewShareState({
      ...baseState,
      modifiers: [modifierFromPreset(modifier, "modifier-future-type")],
    });

    expect(serialized?.get("m")).toBe(
      "preset:future-coma-corrector:custom:0.7",
    );

    const parsed = parseFieldOfViewShareState(serialized!, catalogue);
    expect(parsed.notice).toBeNull();
    expect(parsed.state.modifiers[0]?.modifierType).toBe("coma-corrector");
    expect(serializeFieldOfViewShareState(parsed.state)?.toString()).toBe(
      serialized?.toString(),
    );
  });

  it("normalizes invalid draft values behind the inactive camera geometry", () => {
    const baseState = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const state = {
      ...baseState,
      camera: {
        ...baseState.camera,
        geometryMode: "physical-dimensions" as const,
        resolutionWidthPx: "",
      },
    };

    const serialized = serializeFieldOfViewShareState(state);

    expect(serialized).not.toBeNull();
    expect(serialized?.has("rw")).toBe(false);
    const parsed = parseFieldOfViewShareState(
      serialized!,
      fieldOfViewCatalogueFixture,
    );
    expect(parsed.notice).toBeNull();
    expect(parsed.state.camera.resolutionWidthPx).toBe("6248");
  });

  it("preserves numeric results as manual values when referenced presets disappear", () => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(
        "v=1&t=retired-scope&tm=preset&fm=direct&f=480&a=80&fr=6&c=retired-camera&cm=preset&cg=physical-dimensions&sw=10&sh=8&px=3.2&rw=3000&rh=2000&m=preset%3Aretired-reducer%3Areducer%3A0.8&target=m31-andromeda-galaxy",
      ),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.state.telescope).toMatchObject({
      mode: "manual",
      nativeFocalLengthMm: "480",
      apertureMm: "80",
      lastPreset: null,
    });
    expect(parsed.state.camera).toMatchObject({
      mode: "manual",
      sensorWidthMm: "10",
      sensorHeightMm: "8",
      pixelSizeUm: "3.2",
      lastPreset: null,
    });
    expect(parsed.state.modifiers[0]).toMatchObject({
      source: "manual",
      multiplier: "0.8",
    });
    expect(parsed.notice).toEqual({
      kind: "invalid-settings",
      settings: [
        "telescope preset",
        "telescope source",
        "camera preset",
        "camera source",
        "optical modifier preset",
      ],
    });
  });

  it.each([
    ["f", "9.99", "native focal length"],
    ["a", "2000.01", "aperture"],
    ["fr", "0.004", "focal ratio"],
    ["sw", "0", "sensor width"],
    ["sh", "1001", "sensor height"],
    ["px", "0x10", "pixel size"],
    ["rw", "1.5", "sensor resolution"],
    ["rh", "200001", "sensor resolution"],
    ["s", "Infinity", "seeing"],
    ["zoom", "4.01", "display zoom"],
    ["rot", "1.5", "frame rotation"],
  ])("bounds %s=%s", (key, value, expectedSetting) => {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(`v=1&${key}=${value}`),
      fieldOfViewCatalogueFixture,
    );

    expect(parsed.notice).toMatchObject({
      kind: "invalid-settings",
      settings: expect.arrayContaining([expectedSetting]),
    });
  });

  it("bounds total query and known value lengths before state construction", () => {
    const oversized = new URLSearchParams();
    oversized.set("v", "1");
    oversized.set("f", "1".repeat(MAX_SHARE_QUERY_LENGTH));
    expect(
      parseFieldOfViewShareState(oversized, fieldOfViewCatalogueFixture),
    ).toMatchObject({
      notice: { kind: "invalid-settings", settings: ["shared link"] },
    });

    const normalized = normaliseFieldOfViewPageSearchParams({
      v: ["1", "1", "1"],
      f: "9".repeat(MAX_SHARE_PARAMETER_LENGTH + 100),
      m: Array.from({ length: 20 }, () => "manual:manual:custom:1"),
      unknown: "ignored",
    });
    expect(normalized.getAll("v")).toHaveLength(2);
    expect(normalized.get("f")).toHaveLength(MAX_SHARE_PARAMETER_LENGTH + 1);
    expect(normalized.getAll("m")).toHaveLength(9);
    expect(normalized.has("unknown")).toBe(false);
  });

  it("extracts only bounded, valid catalogue references", () => {
    const references = extractFieldOfViewShareReferences(
      new URLSearchParams(COMPLEX_FIELD_OF_VIEW_SHARE_V1 + "&token=secret"),
    );

    expect(references).toEqual({
      telescopeSlug: "edgehd-8-optical-tube-assembly",
      cameraSlug: "asi533mc-pro",
      modifierSlugs: ["reducer-lens-0-7x-edgehd-800"],
    });
  });

  it("does not serialize an invalid current form", () => {
    const state = createEquipmentConfiguration(fieldOfViewCatalogueFixture);
    const invalid = {
      ...state,
      telescope: { ...state.telescope, nativeFocalLengthMm: "" },
    };

    expect(serializeFieldOfViewShareState(invalid)).toBeNull();
  });
});
