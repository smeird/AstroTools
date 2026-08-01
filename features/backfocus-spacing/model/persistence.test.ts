import { describe, expect, it } from "vitest";
import {
  parseBackfocusSpacing,
  serializeBackfocusSpacing,
} from "./persistence";

const values = {
  nominalBackfocusMm: "55",
  cameraDepthMm: "17.5",
  filterWheelDepthMm: "20",
  guiderDepthMm: "0",
  otherAdaptersMm: "5",
  installedSpacerMm: "13",
  filterThicknessMm: "2",
  filterRefractiveIndex: "1.5",
};

describe("back-focus persistence", () => {
  it("round-trips versioned settings", () => {
    expect(parseBackfocusSpacing(serializeBackfocusSpacing(values))).toEqual(
      values,
    );
  });
  it("rejects invalid settings", () => {
    expect(parseBackfocusSpacing('{"version":2}')).toBeNull();
  });
});
