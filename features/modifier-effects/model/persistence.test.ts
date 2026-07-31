import { describe, expect, it } from "vitest";

import { parseModifierEffects, serializeModifierEffects } from "./persistence";

const values = {
  nativeFocalLengthMm: "1000",
  apertureMm: "200",
  modifierFactor: "0.7",
  sensorWidthMm: "23.5",
  sensorHeightMm: "15.7",
  pixelSizeUm: "3.76",
  binningFactor: "1",
};

describe("modifier effects persistence", () => {
  it("round-trips versioned settings", () => {
    expect(parseModifierEffects(serializeModifierEffects(values))).toEqual(
      values,
    );
  });

  it("rejects invalid settings", () => {
    expect(parseModifierEffects('{"version":2,"values":{}}')).toBeNull();
  });
});
