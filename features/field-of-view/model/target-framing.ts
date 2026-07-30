import type { FieldOfViewDeg } from "@/lib/calculations";

export const MIN_DISPLAY_ZOOM = 0.1;
export const MAX_DISPLAY_ZOOM = 10;
export const TARGET_FRAMING_VIEWPORT_PADDING_FACTOR = 1.2;
export const TARGET_FRAMING_GRID_INTERVAL_TARGET = 8;

export type SensorOrientation = "landscape" | "portrait";

export interface AngularPointDeg {
  readonly xDeg: number;
  readonly yDeg: number;
}

export interface AngularBoundsDeg {
  readonly minXDeg: number;
  readonly minYDeg: number;
  readonly maxXDeg: number;
  readonly maxYDeg: number;
  readonly widthDeg: number;
  readonly heightDeg: number;
}

export interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
}

export interface NormalizedBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AngularRectangleGeometry {
  readonly widthDeg: number;
  readonly heightDeg: number;
  readonly rotationDeg: number;
  readonly cornersDeg: readonly AngularPointDeg[];
  readonly boundsDeg: AngularBoundsDeg;
}

export interface AngularViewportDeg {
  readonly minXDeg: number;
  readonly minYDeg: number;
  readonly widthDeg: number;
  readonly heightDeg: number;
}

export interface AngularGridLine {
  /** Angular coordinate relative to the centred target, in degrees. */
  readonly coordinateDeg: number;
  /** SVG/CSS-friendly position across the displayed viewport. */
  readonly normalizedPosition: number;
}

export interface AngularGridGeometry {
  readonly spacingDeg: number;
  readonly verticalLines: readonly AngularGridLine[];
  readonly horizontalLines: readonly AngularGridLine[];
}

export interface AngularScaleBarGeometry {
  readonly angularLengthDeg: number;
  readonly normalizedLength: number;
  readonly normalizedStart: NormalizedPoint;
  readonly normalizedEnd: NormalizedPoint;
}

export interface CenteredTargetFitAssessment {
  /** True when every rotated target corner is inside the rotated sensor frame. */
  readonly fits: boolean;
  /** Target span after transforming all four target corners into frame axes. */
  readonly requiredWidthDeg: number;
  readonly requiredHeightDeg: number;
  /** Total clearance; a negative value is angular overflow. */
  readonly horizontalMarginDeg: number;
  readonly verticalMarginDeg: number;
}

export interface TargetFramingInput {
  readonly fieldOfViewDeg: FieldOfViewDeg;
  readonly targetAngularWidthDeg: number;
  readonly targetAngularHeightDeg: number;
  /** Catalogue/default target orientation, independent of the user frame. */
  readonly targetRotationDeg: number;
  /** User-controlled sensor-frame rotation. */
  readonly frameRotationDeg: number;
  readonly sensorOrientation: SensorOrientation;
  /** Display-only magnification. It never changes angular geometry or FOV. */
  readonly displayZoom: number;
}

export interface TargetFramingGeometry {
  /** Unmodified calculation output retained for invariance and textual output. */
  readonly calculatedFieldOfViewDeg: FieldOfViewDeg;
  readonly displayZoom: number;
  readonly sensorOrientation: SensorOrientation;
  readonly sensorFrame: AngularRectangleGeometry;
  readonly target: AngularRectangleGeometry;
  readonly frameToTargetRatio: {
    readonly horizontal: number;
    readonly vertical: number;
  };
  readonly centeredTargetFit: CenteredTargetFitAssessment;
  /** Auto-fit angular scene before the independent display zoom is applied. */
  readonly baseViewportDeg: AngularViewportDeg;
  /** Visible angular scene. Its dimensions are base dimensions / displayZoom. */
  readonly displayViewportDeg: AngularViewportDeg;
  readonly display: {
    readonly sensorFrameCorners: readonly NormalizedPoint[];
    readonly targetCorners: readonly NormalizedPoint[];
    readonly sensorFrameBounds: NormalizedBounds;
    readonly targetBounds: NormalizedBounds;
  };
  readonly grid: AngularGridGeometry;
  readonly scaleBar: AngularScaleBarGeometry;
}

export class TargetFramingInputError extends RangeError {
  readonly field: string;

  constructor(field: string, requirement: string) {
    super(`${field} ${requirement}`);
    this.name = "TargetFramingInputError";
    this.field = field;
  }
}

function requirePositiveFinite(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TargetFramingInputError(
      field,
      "must be finite and greater than 0",
    );
  }

  return value;
}

function requireFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new TargetFramingInputError(field, "must be finite");
  }

  return value;
}

function requireDisplayZoom(value: number): number {
  if (
    !Number.isFinite(value) ||
    value < MIN_DISPLAY_ZOOM ||
    value > MAX_DISPLAY_ZOOM
  ) {
    throw new TargetFramingInputError(
      "displayZoom",
      `must be from ${MIN_DISPLAY_ZOOM} to ${MAX_DISPLAY_ZOOM}`,
    );
  }

  return value;
}

function requirePositiveFiniteResult(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TargetFramingInputError(
      field,
      "could not be represented as a positive finite number",
    );
  }

  return value;
}

export function normalizeRotationDegrees(rotationDeg: number): number {
  const rotation = requireFinite(rotationDeg, "rotationDeg");
  const normalized = ((((rotation + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

/**
 * Converts an astronomical position angle (north through east) to the SVG
 * display convention (clockwise from the horizontal) for a north-up,
 * east-left view. Rectangle axes are undirected, so equivalent 180° values
 * normalize to the same displayed line.
 */
export function positionAngleToDisplayRotationDegrees(
  positionAngleDeg: number,
): number {
  const positionAngle = requireFinite(positionAngleDeg, "positionAngleDeg");
  return normalizeRotationDegrees(90 - positionAngle);
}

function rectangleCorners(
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number,
): readonly AngularPointDeg[] {
  const halfWidth = widthDeg / 2;
  const halfHeight = heightDeg / 2;
  const radians = (rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return [
    { xDeg: -halfWidth, yDeg: -halfHeight },
    { xDeg: halfWidth, yDeg: -halfHeight },
    { xDeg: halfWidth, yDeg: halfHeight },
    { xDeg: -halfWidth, yDeg: halfHeight },
  ].map(({ xDeg, yDeg }) => ({
    xDeg: xDeg * cosine - yDeg * sine,
    yDeg: xDeg * sine + yDeg * cosine,
  }));
}

function boundsForPoints(points: readonly AngularPointDeg[]): AngularBoundsDeg {
  const xCoordinates = points.map(({ xDeg }) => xDeg);
  const yCoordinates = points.map(({ yDeg }) => yDeg);
  const minXDeg = Math.min(...xCoordinates);
  const maxXDeg = Math.max(...xCoordinates);
  const minYDeg = Math.min(...yCoordinates);
  const maxYDeg = Math.max(...yCoordinates);

  return {
    minXDeg,
    minYDeg,
    maxXDeg,
    maxYDeg,
    widthDeg: requirePositiveFiniteResult(maxXDeg - minXDeg, "bounds.widthDeg"),
    heightDeg: requirePositiveFiniteResult(
      maxYDeg - minYDeg,
      "bounds.heightDeg",
    ),
  };
}

function rectangleGeometry(
  widthDeg: number,
  heightDeg: number,
  rotationDeg: number,
): AngularRectangleGeometry {
  const normalizedRotation = normalizeRotationDegrees(rotationDeg);
  const cornersDeg = rectangleCorners(widthDeg, heightDeg, normalizedRotation);

  return {
    widthDeg,
    heightDeg,
    rotationDeg: normalizedRotation,
    cornersDeg,
    boundsDeg: boundsForPoints(cornersDeg),
  };
}

function orientedSensorDimensions(
  fieldOfViewDeg: FieldOfViewDeg,
  orientation: SensorOrientation,
): { widthDeg: number; heightDeg: number } {
  const horizontalDeg = requirePositiveFinite(
    fieldOfViewDeg.horizontalDeg,
    "fieldOfViewDeg.horizontalDeg",
  );
  const verticalDeg = requirePositiveFinite(
    fieldOfViewDeg.verticalDeg,
    "fieldOfViewDeg.verticalDeg",
  );

  requirePositiveFinite(
    fieldOfViewDeg.diagonalDeg,
    "fieldOfViewDeg.diagonalDeg",
  );

  const longSide = Math.max(horizontalDeg, verticalDeg);
  const shortSide = Math.min(horizontalDeg, verticalDeg);

  return orientation === "landscape"
    ? { widthDeg: longSide, heightDeg: shortSide }
    : { widthDeg: shortSide, heightDeg: longSide };
}

function rotatePoint(
  point: AngularPointDeg,
  rotationDeg: number,
): AngularPointDeg {
  const radians = (rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    xDeg: point.xDeg * cosine - point.yDeg * sine,
    yDeg: point.xDeg * sine + point.yDeg * cosine,
  };
}

function centeredFitAssessment(
  sensorFrame: AngularRectangleGeometry,
  target: AngularRectangleGeometry,
): CenteredTargetFitAssessment {
  const targetCornersInFrame = target.cornersDeg.map((corner) =>
    rotatePoint(corner, -sensorFrame.rotationDeg),
  );
  const requiredWidthDeg =
    2 * Math.max(...targetCornersInFrame.map(({ xDeg }) => Math.abs(xDeg)));
  const requiredHeightDeg =
    2 * Math.max(...targetCornersInFrame.map(({ yDeg }) => Math.abs(yDeg)));
  const rawHorizontalMarginDeg = sensorFrame.widthDeg - requiredWidthDeg;
  const rawVerticalMarginDeg = sensorFrame.heightDeg - requiredHeightDeg;
  const tolerance =
    Math.max(
      sensorFrame.widthDeg,
      sensorFrame.heightDeg,
      requiredWidthDeg,
      requiredHeightDeg,
    ) *
    Number.EPSILON *
    16;
  const horizontalMarginDeg =
    Math.abs(rawHorizontalMarginDeg) <= tolerance ? 0 : rawHorizontalMarginDeg;
  const verticalMarginDeg =
    Math.abs(rawVerticalMarginDeg) <= tolerance ? 0 : rawVerticalMarginDeg;

  return {
    fits: horizontalMarginDeg >= 0 && verticalMarginDeg >= 0,
    requiredWidthDeg,
    requiredHeightDeg,
    horizontalMarginDeg,
    verticalMarginDeg,
  };
}

function centeredViewport(
  widthDeg: number,
  heightDeg: number,
): AngularViewportDeg {
  return {
    minXDeg: -widthDeg / 2,
    minYDeg: -heightDeg / 2,
    widthDeg,
    heightDeg,
  };
}

function normalizePoint(
  point: AngularPointDeg,
  viewport: AngularViewportDeg,
): NormalizedPoint {
  return {
    x: (point.xDeg - viewport.minXDeg) / viewport.widthDeg,
    y: (point.yDeg - viewport.minYDeg) / viewport.heightDeg,
  };
}

function normalizeBounds(
  bounds: AngularBoundsDeg,
  viewport: AngularViewportDeg,
): NormalizedBounds {
  return {
    x: (bounds.minXDeg - viewport.minXDeg) / viewport.widthDeg,
    y: (bounds.minYDeg - viewport.minYDeg) / viewport.heightDeg,
    width: bounds.widthDeg / viewport.widthDeg,
    height: bounds.heightDeg / viewport.heightDeg,
  };
}

function niceCeiling(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const power = Math.max(10 ** exponent, Number.MIN_VALUE);
  const fraction = value / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return requirePositiveFiniteResult(factor * power, "grid.spacingDeg");
}

function niceFloor(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const power = Math.max(10 ** exponent, Number.MIN_VALUE);
  const fraction = value / power;
  const factor = fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1;
  return requirePositiveFiniteResult(
    factor * power,
    "scaleBar.angularLengthDeg",
  );
}

function gridLines(
  minimumDeg: number,
  extentDeg: number,
  spacingDeg: number,
): readonly AngularGridLine[] {
  const maximumDeg = minimumDeg + extentDeg;
  const firstIndex = Math.ceil(minimumDeg / spacingDeg);
  const lastIndex = Math.floor(maximumDeg / spacingDeg);
  const lines: AngularGridLine[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const rawCoordinateDeg = index * spacingDeg;
    const coordinateDeg = Object.is(rawCoordinateDeg, -0)
      ? 0
      : rawCoordinateDeg;
    lines.push({
      coordinateDeg,
      normalizedPosition: (coordinateDeg - minimumDeg) / extentDeg,
    });
  }

  return lines;
}

function angularGrid(viewport: AngularViewportDeg): AngularGridGeometry {
  const spacingDeg = niceCeiling(
    Math.max(viewport.widthDeg, viewport.heightDeg) /
      TARGET_FRAMING_GRID_INTERVAL_TARGET,
  );

  return {
    spacingDeg,
    verticalLines: gridLines(viewport.minXDeg, viewport.widthDeg, spacingDeg),
    horizontalLines: gridLines(
      viewport.minYDeg,
      viewport.heightDeg,
      spacingDeg,
    ),
  };
}

function angularScaleBar(
  viewport: AngularViewportDeg,
): AngularScaleBarGeometry {
  const angularLengthDeg = niceFloor(viewport.widthDeg / 5);
  const normalizedLength = angularLengthDeg / viewport.widthDeg;
  const normalizedStart = { x: 0.06, y: 0.92 } as const;

  return {
    angularLengthDeg,
    normalizedLength,
    normalizedStart,
    normalizedEnd: {
      x: normalizedStart.x + normalizedLength,
      y: normalizedStart.y,
    },
  };
}

export function calculateTargetFramingGeometry({
  fieldOfViewDeg,
  targetAngularWidthDeg: targetWidthInput,
  targetAngularHeightDeg: targetHeightInput,
  targetRotationDeg,
  frameRotationDeg,
  sensorOrientation,
  displayZoom: displayZoomInput,
}: TargetFramingInput): TargetFramingGeometry {
  if (sensorOrientation !== "landscape" && sensorOrientation !== "portrait") {
    throw new TargetFramingInputError(
      "sensorOrientation",
      'must be "landscape" or "portrait"',
    );
  }

  const displayZoom = requireDisplayZoom(displayZoomInput);
  const targetWidthDeg = requirePositiveFinite(
    targetWidthInput,
    "targetAngularWidthDeg",
  );
  const targetHeightDeg = requirePositiveFinite(
    targetHeightInput,
    "targetAngularHeightDeg",
  );
  const sensorDimensions = orientedSensorDimensions(
    fieldOfViewDeg,
    sensorOrientation,
  );
  const sensorFrame = rectangleGeometry(
    sensorDimensions.widthDeg,
    sensorDimensions.heightDeg,
    frameRotationDeg,
  );
  const target = rectangleGeometry(
    targetWidthDeg,
    targetHeightDeg,
    targetRotationDeg,
  );
  const requiredSceneWidthDeg = Math.max(
    sensorFrame.boundsDeg.widthDeg,
    target.boundsDeg.widthDeg,
  );
  const requiredSceneHeightDeg = Math.max(
    sensorFrame.boundsDeg.heightDeg,
    target.boundsDeg.heightDeg,
  );
  const baseWidthDeg = requirePositiveFiniteResult(
    requiredSceneWidthDeg * TARGET_FRAMING_VIEWPORT_PADDING_FACTOR,
    "baseViewportDeg.widthDeg",
  );
  const baseHeightDeg = requirePositiveFiniteResult(
    requiredSceneHeightDeg * TARGET_FRAMING_VIEWPORT_PADDING_FACTOR,
    "baseViewportDeg.heightDeg",
  );
  const displayWidthDeg = requirePositiveFiniteResult(
    baseWidthDeg / displayZoom,
    "displayViewportDeg.widthDeg",
  );
  const displayHeightDeg = requirePositiveFiniteResult(
    baseHeightDeg / displayZoom,
    "displayViewportDeg.heightDeg",
  );
  const baseViewportDeg = centeredViewport(baseWidthDeg, baseHeightDeg);
  const displayViewportDeg = centeredViewport(
    displayWidthDeg,
    displayHeightDeg,
  );

  return {
    calculatedFieldOfViewDeg: { ...fieldOfViewDeg },
    displayZoom,
    sensorOrientation,
    sensorFrame,
    target,
    frameToTargetRatio: {
      horizontal: sensorFrame.widthDeg / target.widthDeg,
      vertical: sensorFrame.heightDeg / target.heightDeg,
    },
    centeredTargetFit: centeredFitAssessment(sensorFrame, target),
    baseViewportDeg,
    displayViewportDeg,
    display: {
      sensorFrameCorners: sensorFrame.cornersDeg.map((point) =>
        normalizePoint(point, displayViewportDeg),
      ),
      targetCorners: target.cornersDeg.map((point) =>
        normalizePoint(point, displayViewportDeg),
      ),
      sensorFrameBounds: normalizeBounds(
        sensorFrame.boundsDeg,
        displayViewportDeg,
      ),
      targetBounds: normalizeBounds(target.boundsDeg, displayViewportDeg),
    },
    grid: angularGrid(displayViewportDeg),
    scaleBar: angularScaleBar(displayViewportDeg),
  };
}
