import { describe, expect, it } from "vitest";

import { parseSensorTilt, serializeSensorTilt } from "./persistence";

const values = {
  sensorWidthMm: "36",
  sensorHeightMm: "24",
  horizontalFocusDifferenceUm: "18",
  verticalFocusDifferenceUm: "-12",
  adjusterSpacingMm: "50",
};

describe("sensor tilt persistence", () => {
  it("round-trips signed, versioned measurements", () => {
    expect(parseSensorTilt(serializeSensorTilt(values))).toEqual(values);
  });

  it("rejects invalid geometry and versions", () => {
    expect(parseSensorTilt('{"version":2,"values":{}}')).toBeNull();
    expect(
      parseSensorTilt(serializeSensorTilt({ ...values, sensorWidthMm: "0" })),
    ).toBeNull();
  });
});
