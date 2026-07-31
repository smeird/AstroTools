"use client";

import { useId, type Dispatch } from "react";

import { RangeInput, SegmentedControl } from "@/components/design-system";
import type {
  EquipmentConfigurationAction,
  EquipmentConfigurationState,
  SensorOrientation,
} from "../model/equipment-configuration";
import type { TargetFramingGeometry } from "../model/target-framing";
import type { AstronomicalTargetDto } from "../services/catalogue-types";

import styles from "./target-framing-simulator.module.css";

const SENSOR_ORIENTATION_OPTIONS = [
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
] as const;

interface TargetFramingSimulatorProps {
  readonly dispatch: Dispatch<EquipmentConfigurationAction>;
  readonly framing: EquipmentConfigurationState["framing"];
  readonly geometry: TargetFramingGeometry | null;
  readonly target: AstronomicalTargetDto | undefined;
}

function formatDegrees(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits) + "°";
}

function formatAngularScale(valueDeg: number): string {
  if (valueDeg >= 1) {
    return formatDegrees(valueDeg, valueDeg >= 10 ? 0 : 1);
  }

  const arcminutes = valueDeg * 60;
  if (arcminutes >= 1) {
    return arcminutes.toFixed(arcminutes >= 10 ? 0 : 1) + "′";
  }

  return (arcminutes * 60).toFixed(0) + "″";
}

function formatSignificant(value: number): string {
  return String(Number(value.toPrecision(3)));
}

export function formatSignedAngularMargin(valueDeg: number): string {
  if (!Number.isFinite(valueDeg)) {
    throw new RangeError("Angular margin must be finite.");
  }

  const normalizedValue = Object.is(valueDeg, -0) ? 0 : valueDeg;
  const magnitudeDeg = Math.abs(normalizedValue);

  if (magnitudeDeg === 0) {
    return "0°";
  }

  if (magnitudeDeg >= 1) {
    return normalizedValue.toFixed(2) + "°";
  }

  const arcminutes = normalizedValue * 60;
  if (Math.abs(arcminutes) >= 1) {
    return formatSignificant(arcminutes) + "′";
  }

  return formatSignificant(arcminutes * 60) + "″";
}

function formatRotation(value: number): string {
  if (value === 0) {
    return "0 degrees";
  }

  if (Math.abs(value) === 180) {
    return "180 degrees";
  }

  return (
    Math.abs(value).toFixed(0) +
    " degrees " +
    (value > 0 ? "clockwise" : "counter-clockwise")
  );
}

function formatPositionAngle(value: number): string {
  const normalized = ((value % 180) + 180) % 180;
  return normalized.toFixed(0) + " degrees east of north";
}

function safeTargetAssetPath(path: string | null): string | null {
  return path &&
    /^\/targets\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:avif|png|svg|webp)$/.test(path)
    ? path
    : null;
}

function targetLabel(target: AstronomicalTargetDto): string {
  return target.catalogueName === target.commonName
    ? target.commonName
    : target.commonName + " (" + target.catalogueName + ")";
}

function framingDescription(
  target: AstronomicalTargetDto,
  geometry: TargetFramingGeometry,
  targetPositionAngleDeg: number,
): string {
  const fit = geometry.centeredTargetFit.fits
    ? "Its catalogue angular footprint fits within the centred sensor frame."
    : "Its catalogue angular footprint extends beyond the centred sensor frame.";

  return [
    "Proportional framing simulator for " + targetLabel(target) + ".",
    "Target extent " +
      formatDegrees(geometry.target.widthDeg) +
      " by " +
      formatDegrees(geometry.target.heightDeg) +
      " at position angle " +
      formatPositionAngle(targetPositionAngleDeg) +
      ".",
    (geometry.sensorOrientation === "landscape" ? "Landscape" : "Portrait") +
      " sensor field " +
      formatDegrees(geometry.sensorFrame.widthDeg) +
      " by " +
      formatDegrees(geometry.sensorFrame.heightDeg) +
      ", rotated " +
      formatRotation(geometry.sensorFrame.rotationDeg) +
      ".",
    fit,
    target.framingNote ?? "",
    "Display zoom " +
      geometry.displayZoom.toFixed(2) +
      " times changes only this view.",
  ]
    .filter(Boolean)
    .join(" ");
}

function AngularScaleBar({ geometry }: { geometry: TargetFramingGeometry }) {
  const viewport = geometry.displayViewportDeg;
  const startX =
    viewport.minXDeg + geometry.scaleBar.normalizedStart.x * viewport.widthDeg;
  const endX =
    viewport.minXDeg + geometry.scaleBar.normalizedEnd.x * viewport.widthDeg;
  const lineY =
    viewport.minYDeg + geometry.scaleBar.normalizedStart.y * viewport.heightDeg;
  const labelFontSizeDeg =
    Math.max(viewport.widthDeg, viewport.heightDeg) * 0.03;
  const labelY = lineY - labelFontSizeDeg * 0.65;

  return (
    <g
      aria-hidden="true"
      className={styles.scaleBar}
      data-angular-length-deg={geometry.scaleBar.angularLengthDeg}
      data-testid="angular-scale-bar"
    >
      <line
        data-testid="angular-scale-bar-line"
        vectorEffect="non-scaling-stroke"
        x1={startX}
        x2={endX}
        y1={lineY}
        y2={lineY}
      />
      <text
        data-testid="angular-scale-bar-label"
        fontSize={labelFontSizeDeg}
        x={startX}
        y={labelY}
      >
        {formatAngularScale(geometry.scaleBar.angularLengthDeg)}
      </text>
    </g>
  );
}

function polygonPoints(
  points: TargetFramingGeometry["sensorFrame"]["cornersDeg"],
): string {
  return points.map(({ xDeg, yDeg }) => xDeg + "," + yDeg).join(" ");
}

function FitStatus({ geometry }: { geometry: TargetFramingGeometry }) {
  const horizontalMargin = geometry.centeredTargetFit.horizontalMarginDeg;
  const verticalMargin = geometry.centeredTargetFit.verticalMarginDeg;

  return (
    <p
      className={styles.fitStatus}
      data-fit={geometry.centeredTargetFit.fits ? "fits" : "extends"}
      data-testid="framing-fit-status"
    >
      <strong>
        {geometry.centeredTargetFit.fits
          ? "Fits within frame"
          : "Extends beyond frame"}
      </strong>
      <span>
        Centred total clearance: {formatSignedAngularMargin(horizontalMargin)}{" "}
        horizontal, {formatSignedAngularMargin(verticalMargin)} vertical.
        Negative values indicate cropping.
      </span>
    </p>
  );
}

export function TargetFramingSimulator({
  dispatch,
  framing,
  geometry,
  target,
}: TargetFramingSimulatorProps) {
  const titleId = useId();
  const descriptionId = useId();
  const assetPath = safeTargetAssetPath(target?.assetPath ?? null);
  const targetPositionAngleDeg = Number(target?.defaultRotationDeg);

  return (
    <section
      aria-labelledby="framing-title"
      className={styles.panel}
      data-testid="framing-simulator"
    >
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Proportional sky geometry</p>
        <h2 id="framing-title">Target framing simulator</h2>
        <p>
          Compare the catalogue target footprint with the exact sensor field.
          North is up and east is left. Catalogue position angles run east from
          north; positive frame rotations are clockwise.
        </p>
      </div>

      <div className={styles.controls}>
        <RangeInput
          description="Magnifies only the drawing; field-of-view calculations and fit remain unchanged."
          id="display-zoom"
          label="Display zoom"
          max={4}
          min={0.5}
          name="display-zoom"
          onValueChange={(value) =>
            dispatch({ type: "framing-display-zoom", value })
          }
          step={0.25}
          value={framing.displayZoom}
          valueText={framing.displayZoom.toFixed(2) + " times; display only"}
        />
        <RangeInput
          description="Rotates the sensor outline around the centred target; it does not alter the calculated field dimensions."
          id="frame-rotation"
          label="Frame rotation"
          max={180}
          min={-180}
          name="frame-rotation"
          onValueChange={(value) =>
            dispatch({ type: "framing-rotation", value })
          }
          step={1}
          value={framing.frameRotationDeg}
          valueText={formatRotation(framing.frameRotationDeg)}
        />
        <SegmentedControl<SensorOrientation>
          description="Portrait swaps the displayed sensor axes without changing the camera or optical calculation."
          id="sensor-orientation"
          label="Sensor orientation"
          name="sensor-orientation"
          onValueChange={(value) =>
            dispatch({ type: "framing-orientation", value })
          }
          options={SENSOR_ORIENTATION_OPTIONS}
          value={framing.sensorOrientation}
        />
      </div>

      {target && geometry ? (
        <>
          <FitStatus geometry={geometry} />
          <figure className={styles.figure}>
            <div className={styles.stage} data-testid="framing-stage">
              <svg
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                className={styles.diagram}
                data-display-zoom={geometry.displayZoom}
                data-field-height-deg={geometry.sensorFrame.heightDeg}
                data-field-width-deg={geometry.sensorFrame.widthDeg}
                data-orientation={geometry.sensorOrientation}
                data-target-height-deg={geometry.target.heightDeg}
                data-target-width-deg={geometry.target.widthDeg}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                viewBox={
                  geometry.displayViewportDeg.minXDeg +
                  " " +
                  geometry.displayViewportDeg.minYDeg +
                  " " +
                  geometry.displayViewportDeg.widthDeg +
                  " " +
                  geometry.displayViewportDeg.heightDeg
                }
              >
                <title id={titleId}>
                  Proportional framing simulator for {targetLabel(target)}
                </title>
                <desc id={descriptionId}>
                  {framingDescription(target, geometry, targetPositionAngleDeg)}
                </desc>
                <rect
                  className={styles.sky}
                  height={geometry.displayViewportDeg.heightDeg}
                  width={geometry.displayViewportDeg.widthDeg}
                  x={geometry.displayViewportDeg.minXDeg}
                  y={geometry.displayViewportDeg.minYDeg}
                />
                <g aria-hidden="true" className={styles.grid}>
                  {geometry.grid.verticalLines.map((line) => (
                    <line
                      className={
                        line.coordinateDeg === 0 ? styles.axis : undefined
                      }
                      key={"vertical-" + line.coordinateDeg}
                      vectorEffect="non-scaling-stroke"
                      x1={line.coordinateDeg}
                      x2={line.coordinateDeg}
                      y1={geometry.displayViewportDeg.minYDeg}
                      y2={
                        geometry.displayViewportDeg.minYDeg +
                        geometry.displayViewportDeg.heightDeg
                      }
                    />
                  ))}
                  {geometry.grid.horizontalLines.map((line) => (
                    <line
                      className={
                        line.coordinateDeg === 0 ? styles.axis : undefined
                      }
                      key={"horizontal-" + line.coordinateDeg}
                      vectorEffect="non-scaling-stroke"
                      x1={geometry.displayViewportDeg.minXDeg}
                      x2={
                        geometry.displayViewportDeg.minXDeg +
                        geometry.displayViewportDeg.widthDeg
                      }
                      y1={line.coordinateDeg}
                      y2={line.coordinateDeg}
                    />
                  ))}
                </g>
                <g
                  aria-hidden="true"
                  transform={"rotate(" + geometry.target.rotationDeg + ")"}
                >
                  <rect
                    className={styles.targetFootprint}
                    data-testid="target-footprint"
                    height={geometry.target.heightDeg}
                    vectorEffect="non-scaling-stroke"
                    width={geometry.target.widthDeg}
                    x={-geometry.target.widthDeg / 2}
                    y={-geometry.target.heightDeg / 2}
                  />
                  {assetPath ? (
                    <image
                      className={styles.targetImage}
                      height={geometry.target.heightDeg}
                      href={assetPath}
                      preserveAspectRatio="none"
                      width={geometry.target.widthDeg}
                      x={-geometry.target.widthDeg / 2}
                      y={-geometry.target.heightDeg / 2}
                    />
                  ) : (
                    <ellipse
                      className={styles.targetFallback}
                      cx="0"
                      cy="0"
                      rx={geometry.target.widthDeg / 2}
                      ry={geometry.target.heightDeg / 2}
                    />
                  )}
                </g>
                <g aria-hidden="true" className={styles.sensorFrame}>
                  <polygon
                    data-frame-rotation-deg={geometry.sensorFrame.rotationDeg}
                    data-testid="sensor-frame"
                    points={polygonPoints(geometry.sensorFrame.cornersDeg)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    vectorEffect="non-scaling-stroke"
                    x1={geometry.sensorFrame.cornersDeg[0]?.xDeg}
                    x2={geometry.sensorFrame.cornersDeg[2]?.xDeg}
                    y1={geometry.sensorFrame.cornersDeg[0]?.yDeg}
                    y2={geometry.sensorFrame.cornersDeg[2]?.yDeg}
                  />
                  <line
                    vectorEffect="non-scaling-stroke"
                    x1={geometry.sensorFrame.cornersDeg[1]?.xDeg}
                    x2={geometry.sensorFrame.cornersDeg[3]?.xDeg}
                    y1={geometry.sensorFrame.cornersDeg[1]?.yDeg}
                    y2={geometry.sensorFrame.cornersDeg[3]?.yDeg}
                  />
                </g>
                <AngularScaleBar geometry={geometry} />
              </svg>
              <span
                aria-hidden="true"
                className={styles.orientationMark}
                data-testid="framing-orientation-mark"
              >
                N ↑ · E ←
              </span>
              <span
                aria-hidden="true"
                className={styles.gridLabel}
                data-testid="framing-grid-label"
              >
                Grid {formatAngularScale(geometry.grid.spacingDeg)}
              </span>
            </div>
            <figcaption className={styles.caption}>
              <strong>Illustrative representation.</strong> The target artwork
              is recognisable but is not a calibrated sky survey and does not
              represent surface brightness or faint extensions.
              {target.framingNote ? (
                <span
                  className={styles.footprintNote}
                  data-testid="target-framing-note"
                >
                  <strong>Footprint qualification.</strong> {target.framingNote}
                </span>
              ) : null}
            </figcaption>
          </figure>

          <dl
            className={styles.textEquivalent}
            data-testid="framing-text-equivalent"
          >
            <div>
              <dt>Target footprint</dt>
              <dd>
                {targetLabel(target)}, {formatDegrees(geometry.target.widthDeg)}{" "}
                × {formatDegrees(geometry.target.heightDeg)}; catalogue position
                angle {formatPositionAngle(targetPositionAngleDeg)}.
              </dd>
            </div>
            <div>
              <dt>Displayed sensor field</dt>
              <dd>
                {formatDegrees(geometry.sensorFrame.widthDeg)} ×{" "}
                {formatDegrees(geometry.sensorFrame.heightDeg)},{" "}
                {geometry.sensorOrientation}, frame rotated{" "}
                {formatRotation(geometry.sensorFrame.rotationDeg)}.
              </dd>
            </div>
            <div>
              <dt>Centred geometric fit</dt>
              <dd>
                {geometry.centeredTargetFit.fits
                  ? "Fits within the frame."
                  : "Extends beyond the frame."}{" "}
                {target.framingNote ? target.framingNote + " " : null}
                This footprint estimate does not account for faint extensions,
                brightness, tracking, focus, or processing.
              </dd>
            </div>
            <div>
              <dt>Display guide</dt>
              <dd>
                {geometry.displayZoom.toFixed(2)}× visual zoom only;{" "}
                {formatAngularScale(geometry.grid.spacingDeg)} grid and{" "}
                {formatAngularScale(geometry.scaleBar.angularLengthDeg)} scale
                bar. North is up and east is left.
              </dd>
            </div>
            <div>
              <dt>Sources and credit</dt>
              <dd>
                {target.assetCredit ?? "No local illustration credit supplied"}.{" "}
                {target.assetLicenseUrl ? (
                  <a href={target.assetLicenseUrl}>Asset licence</a>
                ) : null}{" "}
                <a href={target.sourceUrl}>Angular-size source</a>, verified{" "}
                <time dateTime={target.verifiedAt}>
                  {target.verifiedAt.slice(0, 10)}
                </time>
                .
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className={styles.unavailable}>
          Proportional framing is unavailable until the target and required
          imaging values are valid. The equipment controls remain available.
        </p>
      )}
    </section>
  );
}
