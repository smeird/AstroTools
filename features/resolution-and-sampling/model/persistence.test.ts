import { describe, expect, it } from "vitest";

import {
  parseResolutionAndSamplingState,
  serializeResolutionAndSamplingState,
} from "./persistence";

const values = {
  apertureMm: "200",
  wavelengthNm: "550",
  focalLengthMm: "1000",
  pixelSizeUm: "3.76",
  binningFactor: "1",
  seeingFwhmArcsec: "2",
};

describe("resolution and sampling persistence", () => {
  it("round-trips the versioned settings envelope", () => {
    expect(
      parseResolutionAndSamplingState(
        serializeResolutionAndSamplingState(values),
      ),
    ).toEqual(values);
  });

  it("rejects malformed or unsafe stored values", () => {
    expect(
      parseResolutionAndSamplingState('{"version":2,"values":{}}'),
    ).toBeNull();
    expect(
      parseResolutionAndSamplingState(
        JSON.stringify({
          version: 1,
          values: { ...values, apertureMm: "NaN" },
        }),
      ),
    ).toBeNull();
  });
});
