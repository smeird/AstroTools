import { describe, expect, it } from "vitest";

import { fieldOfViewCatalogueFixture } from "../../../tests/fixtures/field-of-view-catalogue";
import { createEquipmentConfiguration } from "./equipment-configuration";
import {
  parsePersistedFieldOfViewState,
  serializePersistedFieldOfViewState,
} from "./persistence";

describe("field of view persistence", () => {
  it("uses the validated share state format for local settings", () => {
    const catalogue = fieldOfViewCatalogueFixture;
    const state = createEquipmentConfiguration(catalogue);
    const serialized = serializePersistedFieldOfViewState(state);

    expect(serialized).toBeTruthy();
    expect(
      parsePersistedFieldOfViewState(serialized ?? "", catalogue),
    ).toMatchObject({
      binning: state.binning,
      seeingFwhmArcsec: state.seeingFwhmArcsec,
      physicalDisplayUnit: state.physicalDisplayUnit,
    });
  });

  it("rejects invalid stored share state", () => {
    expect(
      parsePersistedFieldOfViewState(
        "v=1&f=invalid",
        fieldOfViewCatalogueFixture,
      ),
    ).toBeNull();
  });
});
