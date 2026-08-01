import { describe, expect, it } from "vitest";

import { parseGuidingRatio, serializeGuidingRatio } from "./persistence";

const values = {
  imagingFocalLengthMm: "1000",
  imagingPixelSizeUm: "3.76",
  imagingBinning: "1",
  guideFocalLengthMm: "240",
  guidePixelSizeUm: "3.75",
  guideBinning: "1",
};

describe("guiding ratio persistence", () => {
  it("round-trips versioned settings", () => {
    expect(parseGuidingRatio(serializeGuidingRatio(values))).toEqual(values);
  });

  it("rejects invalid or unsupported settings", () => {
    expect(parseGuidingRatio('{"version":2,"values":{}}')).toBeNull();
    expect(
      parseGuidingRatio(
        serializeGuidingRatio({ ...values, guideFocalLengthMm: "0" }),
      ),
    ).toBeNull();
  });
});
