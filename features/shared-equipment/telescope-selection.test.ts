import { describe, expect, it } from "vitest";

import {
  applySharedTelescopeWhenChanged,
  parseSharedTelescopeSelection,
  serializeSharedTelescopeSelection,
  type SharedTelescopeSelection,
} from "./telescope-selection";

const telescope: SharedTelescopeSelection = {
  version: 1,
  slug: "edgehd-8",
  label: "Celestron EdgeHD 8",
  nativeFocalLengthMm: "2032",
  apertureMm: "203.2",
};

describe("shared telescope selection", () => {
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
