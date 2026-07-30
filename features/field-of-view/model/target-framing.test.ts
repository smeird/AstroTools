import { describe, expect, it } from "vitest";

import { calculateExactFieldOfView } from "@/lib/calculations";
import {
  MAX_DISPLAY_ZOOM,
  MIN_DISPLAY_ZOOM,
  TargetFramingInputError,
  calculateTargetFramingGeometry,
  normalizeRotationDegrees,
  positionAngleToDisplayRotationDegrees,
  type TargetFramingInput,
} from "./target-framing";

const FIELD_OF_VIEW = Object.freeze({
  horizontalDeg: 2,
  verticalDeg: 1,
  diagonalDeg: Math.sqrt(5),
});

const BASE_INPUT = Object.freeze({
  fieldOfViewDeg: FIELD_OF_VIEW,
  targetAngularWidthDeg: 4,
  targetAngularHeightDeg: 2,
  targetRotationDeg: 0,
  frameRotationDeg: 0,
  sensorOrientation: "landscape",
  displayZoom: 1,
}) satisfies TargetFramingInput;

function calculateWith(
  overrides: Partial<TargetFramingInput>,
): ReturnType<typeof calculateTargetFramingGeometry> {
  return calculateTargetFramingGeometry({ ...BASE_INPUT, ...overrides });
}

describe("target framing geometry", () => {
  it("keeps the sensor and target mathematically proportional in angular space", () => {
    const result = calculateTargetFramingGeometry(BASE_INPUT);

    expect(result.calculatedFieldOfViewDeg).toEqual(FIELD_OF_VIEW);
    expect(result.calculatedFieldOfViewDeg).not.toBe(FIELD_OF_VIEW);
    expect(result.sensorFrame).toMatchObject({
      widthDeg: 2,
      heightDeg: 1,
      rotationDeg: 0,
    });
    expect(result.target).toMatchObject({
      widthDeg: 4,
      heightDeg: 2,
      rotationDeg: 0,
    });
    expect(result.frameToTargetRatio).toEqual({
      horizontal: 0.5,
      vertical: 0.5,
    });
    expect(result.baseViewportDeg).toEqual({
      minXDeg: -2.4,
      minYDeg: -1.2,
      widthDeg: 4.8,
      heightDeg: 2.4,
    });

    expect(result.sensorFrame.boundsDeg.widthDeg).toBeCloseTo(2, 12);
    expect(result.sensorFrame.boundsDeg.heightDeg).toBeCloseTo(1, 12);
    expect(result.target.boundsDeg.widthDeg).toBeCloseTo(4, 12);
    expect(result.target.boundsDeg.heightDeg).toBeCloseTo(2, 12);
    expect(result.display.targetBounds.width).toBeCloseTo(4 / 4.8, 12);
    expect(result.display.targetBounds.height).toBeCloseTo(2 / 2.4, 12);
  });

  it("orients the same calculated field as landscape or portrait without changing it", () => {
    const landscape = calculateWith({
      targetAngularWidthDeg: 1,
      targetAngularHeightDeg: 1,
      sensorOrientation: "landscape",
    });
    const portrait = calculateWith({
      targetAngularWidthDeg: 1,
      targetAngularHeightDeg: 1,
      sensorOrientation: "portrait",
    });

    expect(landscape.sensorFrame).toMatchObject({
      widthDeg: 2,
      heightDeg: 1,
    });
    expect(portrait.sensorFrame).toMatchObject({
      widthDeg: 1,
      heightDeg: 2,
    });
    expect(landscape.frameToTargetRatio).toEqual({
      horizontal: 2,
      vertical: 1,
    });
    expect(portrait.frameToTargetRatio).toEqual({
      horizontal: 1,
      vertical: 2,
    });
    expect(landscape.calculatedFieldOfViewDeg).toEqual(FIELD_OF_VIEW);
    expect(portrait.calculatedFieldOfViewDeg).toEqual(FIELD_OF_VIEW);
  });

  it("normalizes rotations and computes rotated angular bounds", () => {
    const result = calculateWith({
      targetAngularWidthDeg: 2,
      targetAngularHeightDeg: 1,
      targetRotationDeg: 270,
      frameRotationDeg: 450,
    });

    expect(result.sensorFrame.rotationDeg).toBe(90);
    expect(result.target.rotationDeg).toBe(-90);
    expect(result.sensorFrame.boundsDeg.widthDeg).toBeCloseTo(1, 12);
    expect(result.sensorFrame.boundsDeg.heightDeg).toBeCloseTo(2, 12);
    expect(result.target.boundsDeg.widthDeg).toBeCloseTo(1, 12);
    expect(result.target.boundsDeg.heightDeg).toBeCloseTo(2, 12);
  });

  it.each([
    { input: 0, expected: 0 },
    { input: 180, expected: -180 },
    { input: -180, expected: -180 },
    { input: 360, expected: 0 },
    { input: 450, expected: 90 },
    { input: -390, expected: -30 },
    { input: 765, expected: 45 },
  ])(
    "normalizes $input degrees to $expected degrees",
    ({ input, expected }) => {
      expect(normalizeRotationDegrees(input)).toBe(expected);
    },
  );

  it.each([
    { positionAngleDeg: 0, displayRotationDeg: 90 },
    { positionAngleDeg: 35, displayRotationDeg: 55 },
    { positionAngleDeg: 90, displayRotationDeg: 0 },
    { positionAngleDeg: 180, displayRotationDeg: -90 },
  ])(
    "converts position angle $positionAngleDeg° north-through-east to $displayRotationDeg° in the display plane",
    ({ positionAngleDeg, displayRotationDeg }) => {
      expect(positionAngleToDisplayRotationDegrees(positionAngleDeg)).toBe(
        displayRotationDeg,
      );
    },
  );

  it("rejects a non-finite catalogue position angle", () => {
    try {
      positionAngleToDisplayRotationDegrees(Number.NaN);
      throw new Error("Expected position-angle validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TargetFramingInputError);
      expect((error as TargetFramingInputError).field).toBe("positionAngleDeg");
    }
  });

  it("converts M31's stored position angle to the SVG width axis before assessing the default field", () => {
    const m31CataloguePositionAngleDeg = 35;
    const m31SvgWidthAxisRotationDeg = positionAngleToDisplayRotationDegrees(
      m31CataloguePositionAngleDeg,
    );
    const defaultField = calculateExactFieldOfView({
      effectiveFocalLengthMm: 600,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
    });
    const result = calculateTargetFramingGeometry({
      fieldOfViewDeg: defaultField,
      targetAngularWidthDeg: 3.3255,
      targetAngularHeightDeg: 1.179833,
      targetRotationDeg: m31SvgWidthAxisRotationDeg,
      frameRotationDeg: 0,
      sensorOrientation: "landscape",
      displayZoom: 1,
    });

    expect(m31SvgWidthAxisRotationDeg).toBe(55);
    expect(result.target.rotationDeg).toBe(55);
    expect(result.centeredTargetFit.requiredWidthDeg).toBeCloseTo(
      2.8738910529550177,
      12,
    );
    expect(result.centeredTargetFit.requiredHeightDeg).toBeCloseTo(
      3.400814530912406,
      12,
    );
    expect(result.centeredTargetFit.horizontalMarginDeg).toBeCloseTo(
      -0.6300931633882794,
      12,
    );
    expect(result.centeredTargetFit.verticalMarginDeg).toBeCloseTo(
      -1.9016605016188535,
      12,
    );
    expect(result.centeredTargetFit.fits).toBe(false);
  });

  it("assesses a centered target by transforming all four corners into frame axes", () => {
    const aligned = calculateWith({
      targetAngularWidthDeg: 1.5,
      targetAngularHeightDeg: 0.8,
      targetRotationDeg: 30,
      frameRotationDeg: 30,
    });
    const perpendicular = calculateWith({
      targetAngularWidthDeg: 1.5,
      targetAngularHeightDeg: 0.8,
      targetRotationDeg: 0,
      frameRotationDeg: 90,
    });

    expect(aligned.centeredTargetFit.fits).toBe(true);
    expect(aligned.centeredTargetFit.requiredWidthDeg).toBeCloseTo(1.5, 12);
    expect(aligned.centeredTargetFit.requiredHeightDeg).toBeCloseTo(0.8, 12);
    expect(aligned.centeredTargetFit.horizontalMarginDeg).toBeCloseTo(0.5, 12);
    expect(aligned.centeredTargetFit.verticalMarginDeg).toBeCloseTo(0.2, 12);

    expect(perpendicular.centeredTargetFit.fits).toBe(false);
    expect(perpendicular.centeredTargetFit.requiredWidthDeg).toBeCloseTo(
      0.8,
      12,
    );
    expect(perpendicular.centeredTargetFit.requiredHeightDeg).toBeCloseTo(
      1.5,
      12,
    );
    expect(perpendicular.centeredTargetFit.horizontalMarginDeg).toBeCloseTo(
      1.2,
      12,
    );
    expect(perpendicular.centeredTargetFit.verticalMarginDeg).toBeCloseTo(
      -0.5,
      12,
    );
  });

  it("treats a target exactly on the frame boundary as fitting", () => {
    const result = calculateWith({
      targetAngularWidthDeg: 2,
      targetAngularHeightDeg: 1,
      targetRotationDeg: 27,
      frameRotationDeg: 27,
    });

    expect(result.centeredTargetFit.fits).toBe(true);
    expect(result.centeredTargetFit.horizontalMarginDeg).toBe(0);
    expect(result.centeredTargetFit.verticalMarginDeg).toBe(0);
  });

  it("keeps the exact calculated field and every canonical relationship invariant under display zoom", () => {
    const exactField = calculateExactFieldOfView({
      effectiveFocalLengthMm: 600,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
    });
    const input = {
      fieldOfViewDeg: exactField,
      targetAngularWidthDeg: 3.167,
      targetAngularHeightDeg: 1,
      targetRotationDeg: 37,
      frameRotationDeg: -22,
      sensorOrientation: "portrait",
      displayZoom: 1,
    } satisfies TargetFramingInput;
    const baseline = calculateTargetFramingGeometry(input);

    for (const displayZoom of [0.5, 2, 4]) {
      const zoomed = calculateTargetFramingGeometry({
        ...input,
        displayZoom,
      });

      expect(zoomed.calculatedFieldOfViewDeg).toEqual(exactField);
      expect(zoomed.sensorFrame).toEqual(baseline.sensorFrame);
      expect(zoomed.target).toEqual(baseline.target);
      expect(zoomed.frameToTargetRatio).toEqual(baseline.frameToTargetRatio);
      expect(zoomed.centeredTargetFit).toEqual(baseline.centeredTargetFit);
      expect(zoomed.baseViewportDeg).toEqual(baseline.baseViewportDeg);
      expect(zoomed.displayViewportDeg.widthDeg).toBeCloseTo(
        baseline.baseViewportDeg.widthDeg / displayZoom,
        12,
      );
      expect(zoomed.displayViewportDeg.heightDeg).toBeCloseTo(
        baseline.baseViewportDeg.heightDeg / displayZoom,
        12,
      );
      expect(zoomed.display.sensorFrameBounds.width).toBeCloseTo(
        baseline.display.sensorFrameBounds.width * displayZoom,
        12,
      );
      expect(zoomed.display.targetBounds.height).toBeCloseTo(
        baseline.display.targetBounds.height * displayZoom,
        12,
      );
    }
  });

  it("returns centered normalized extents suitable for deterministic SVG rendering", () => {
    const fitted = calculateTargetFramingGeometry(BASE_INPUT);
    const zoomed = calculateWith({ displayZoom: 2 });

    for (const bounds of [
      fitted.display.sensorFrameBounds,
      fitted.display.targetBounds,
      zoomed.display.sensorFrameBounds,
      zoomed.display.targetBounds,
    ]) {
      expect(bounds.x + bounds.width / 2).toBeCloseTo(0.5, 12);
      expect(bounds.y + bounds.height / 2).toBeCloseTo(0.5, 12);
    }

    for (const point of [
      ...fitted.display.sensorFrameCorners,
      ...fitted.display.targetCorners,
    ]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }

    expect(zoomed.display.targetBounds.width).toBeCloseTo(
      fitted.display.targetBounds.width * 2,
      12,
    );
    expect(zoomed.display.targetBounds.height).toBeCloseTo(
      fitted.display.targetBounds.height * 2,
      12,
    );
  });

  it("produces deterministic nice-number grid and scale-bar primitives", () => {
    const first = calculateTargetFramingGeometry(BASE_INPUT);
    const second = calculateTargetFramingGeometry(BASE_INPUT);

    expect(first.grid).toEqual(second.grid);
    expect(first.scaleBar).toEqual(second.scaleBar);
    expect(first.grid.spacingDeg).toBe(1);
    expect(
      first.grid.verticalLines.map(({ coordinateDeg }) => coordinateDeg),
    ).toEqual([-2, -1, 0, 1, 2]);
    expect(
      first.grid.horizontalLines.map(({ coordinateDeg }) => coordinateDeg),
    ).toEqual([-1, 0, 1]);
    expect(first.scaleBar.angularLengthDeg).toBe(0.5);
    expect(first.scaleBar.normalizedLength).toBeCloseTo(0.5 / 4.8, 12);
    expect(first.scaleBar.normalizedEnd.x).toBeCloseTo(
      first.scaleBar.normalizedStart.x + first.scaleBar.normalizedLength,
      12,
    );

    for (const line of [
      ...first.grid.verticalLines,
      ...first.grid.horizontalLines,
    ]) {
      expect(line.normalizedPosition).toBeGreaterThanOrEqual(0);
      expect(line.normalizedPosition).toBeLessThanOrEqual(1);
    }

    const zoomed = calculateWith({ displayZoom: 2 });
    expect(zoomed.grid.spacingDeg).toBe(0.5);
    expect(zoomed.scaleBar.angularLengthDeg).toBe(0.2);
  });

  it("does not mutate frozen input objects", () => {
    const frozenInput = Object.freeze({
      ...BASE_INPUT,
      fieldOfViewDeg: Object.freeze({ ...FIELD_OF_VIEW }),
    });
    const snapshot = structuredClone(frozenInput);

    expect(() => calculateTargetFramingGeometry(frozenInput)).not.toThrow();
    expect(frozenInput).toEqual(snapshot);
  });

  it.each([
    {
      label: "zero horizontal field",
      input: {
        ...BASE_INPUT,
        fieldOfViewDeg: { ...FIELD_OF_VIEW, horizontalDeg: 0 },
      },
      field: "fieldOfViewDeg.horizontalDeg",
    },
    {
      label: "non-finite vertical field",
      input: {
        ...BASE_INPUT,
        fieldOfViewDeg: {
          ...FIELD_OF_VIEW,
          verticalDeg: Number.POSITIVE_INFINITY,
        },
      },
      field: "fieldOfViewDeg.verticalDeg",
    },
    {
      label: "negative diagonal field",
      input: {
        ...BASE_INPUT,
        fieldOfViewDeg: { ...FIELD_OF_VIEW, diagonalDeg: -1 },
      },
      field: "fieldOfViewDeg.diagonalDeg",
    },
    {
      label: "zero target width",
      input: { ...BASE_INPUT, targetAngularWidthDeg: 0 },
      field: "targetAngularWidthDeg",
    },
    {
      label: "non-finite target height",
      input: { ...BASE_INPUT, targetAngularHeightDeg: Number.NaN },
      field: "targetAngularHeightDeg",
    },
    {
      label: "non-finite target rotation",
      input: { ...BASE_INPUT, targetRotationDeg: Number.NaN },
      field: "rotationDeg",
    },
    {
      label: "non-finite frame rotation",
      input: { ...BASE_INPUT, frameRotationDeg: Number.POSITIVE_INFINITY },
      field: "rotationDeg",
    },
    {
      label: "zoom below its bound",
      input: { ...BASE_INPUT, displayZoom: MIN_DISPLAY_ZOOM - 0.01 },
      field: "displayZoom",
    },
    {
      label: "zoom above its bound",
      input: { ...BASE_INPUT, displayZoom: MAX_DISPLAY_ZOOM + 0.01 },
      field: "displayZoom",
    },
    {
      label: "non-finite zoom",
      input: { ...BASE_INPUT, displayZoom: Number.NaN },
      field: "displayZoom",
    },
    {
      label: "unknown orientation",
      input: { ...BASE_INPUT, sensorOrientation: "square" },
      field: "sensorOrientation",
    },
    {
      label: "unrepresentable viewport",
      input: { ...BASE_INPUT, targetAngularWidthDeg: Number.MAX_VALUE },
      field: "baseViewportDeg.widthDeg",
    },
  ])("rejects $label", ({ input, field }) => {
    try {
      calculateTargetFramingGeometry(input as TargetFramingInput);
      throw new Error("Expected target framing validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(TargetFramingInputError);
      expect((error as TargetFramingInputError).field).toBe(field);
    }
  });
});
