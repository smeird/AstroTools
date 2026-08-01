import {
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
  type EquipmentConfigurationState,
} from "@/features/field-of-view/model/equipment-configuration";
import {
  cameraSelectionFromConfiguration,
  telescopeSelectionFromConfiguration,
} from "@/features/shared-equipment/telescope-selection";
import { calculateImagingSystem } from "@/lib/calculations";

import styles from "./imaging-train-diagram.module.css";

export type OpticalDesignFamily =
  "refractor" | "catadioptric" | "reflector" | "generic";

export function classifyOpticalDesign(
  opticalDesign: string | null | undefined,
): OpticalDesignFamily {
  const design = opticalDesign?.toLowerCase() ?? "";
  if (/schmidt|cassegrain|maksutov|edgehd/.test(design)) return "catadioptric";
  if (/newton|reflector|ritchey|dall-kirkham/.test(design)) return "reflector";
  if (/refractor|doublet|triplet|petzval|apochromat/.test(design))
    return "refractor";
  return "generic";
}

const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

function TelescopeSilhouette({ family }: { family: OpticalDesignFamily }) {
  if (family === "catadioptric") {
    return (
      <g>
        <ellipse className={styles.glass} cx="62" cy="96" rx="16" ry="58" />
        <rect
          className={styles.scope}
          x="62"
          y="38"
          width="245"
          height="116"
          rx="20"
        />
        <circle className={styles.secondary} cx="84" cy="96" r="20" />
        <rect
          className={styles.ring}
          x="286"
          y="53"
          width="22"
          height="86"
          rx="5"
        />
        <path className={styles.scope} d="M308 74 H350 V118 H308 Z" />
      </g>
    );
  }
  if (family === "reflector") {
    return (
      <g>
        <path
          className={styles.scope}
          d="M48 43 H310 L345 58 V134 L310 149 H48 Z"
        />
        <path className={styles.mirror} d="M58 48 Q32 96 58 144" />
        <line
          className={styles.secondarySupport}
          x1="280"
          y1="48"
          x2="250"
          y2="96"
        />
        <circle className={styles.secondary} cx="250" cy="96" r="11" />
      </g>
    );
  }
  return (
    <g>
      <ellipse className={styles.glass} cx="54" cy="96" rx="20" ry="55" />
      <path
        className={styles.scope}
        d={
          family === "refractor"
            ? "M54 41 H292 L350 68 V124 L292 151 H54 Z"
            : "M54 41 H310 L350 67 V125 L310 151 H54 Z"
        }
      />
      <rect
        className={styles.ring}
        x="292"
        y="55"
        width="18"
        height="82"
        rx="4"
      />
    </g>
  );
}

export function ImagingTrainDiagram({
  state,
}: {
  state: EquipmentConfigurationState;
}) {
  const telescope = telescopeSelectionFromConfiguration(state.telescope);
  const camera = cameraSelectionFromConfiguration(state.camera);
  const resolvedTelescope = resolveTelescopeInputs(state.telescope);
  const resolvedCamera = resolveCameraSensor(state.camera);
  const multipliers = resolveModifierMultipliers(state.modifiers);
  const opticalDesign = state.telescope.lastPreset?.opticalDesign ?? null;
  const family = classifyOpticalDesign(opticalDesign);
  const result =
    resolvedTelescope.nativeFocalLengthMm !== null &&
    resolvedTelescope.apertureMm !== null &&
    resolvedCamera &&
    multipliers
      ? calculateImagingSystem({
          nativeFocalLengthMm: resolvedTelescope.nativeFocalLengthMm,
          apertureMm: resolvedTelescope.apertureMm,
          opticalMultipliers: multipliers,
          sensor: resolvedCamera,
          binningFactor: Number(state.binning),
          seeingFwhmArcsec: state.seeingFwhmArcsec,
        })
      : null;
  const designLabel = opticalDesign ?? "Optical design unspecified";
  const parts = [
    `${telescope?.label ?? "Incomplete telescope"} (${designLabel})`,
    ...state.modifiers.map(
      (modifier) =>
        `${modifier.label}, ${modifier.modifierType}, ${modifier.multiplier}×`,
    ),
    camera?.label ?? "Incomplete camera",
  ];
  const description = `${parts.join(" then ")}; ${state.binning}× binning.`;
  const modifierCount = state.modifiers.length;
  const viewWidth = 660 + modifierCount * 140;
  const cameraX = 485 + modifierCount * 140;
  const facts = [
    ["Optical design", designLabel],
    resolvedTelescope.apertureMm !== null
      ? ["Clear aperture", `Ø ${format(resolvedTelescope.apertureMm, 1)} mm`]
      : null,
    resolvedTelescope.nativeFocalLengthMm !== null
      ? [
          "Native focal length",
          `${format(resolvedTelescope.nativeFocalLengthMm, 0)} mm`,
        ]
      : null,
    result
      ? [
          "Native focal ratio",
          `f/${format(
            Number(resolvedTelescope.nativeFocalLengthMm) /
              Number(resolvedTelescope.apertureMm),
            1,
          )}`,
        ]
      : null,
    result
      ? [
          "Effective focal length",
          `${format(result.effectiveFocalLengthMm, 0)} mm`,
        ]
      : null,
    result
      ? ["Effective focal ratio", `f/${format(result.effectiveFocalRatio, 1)}`]
      : null,
    result
      ? [
          "Sensor",
          `${format(result.sensorDimensionsMm.widthMm)} × ${format(result.sensorDimensionsMm.heightMm)} mm`,
        ]
      : null,
    state.camera.resolutionWidthPx && state.camera.resolutionHeightPx
      ? [
          "Resolution",
          `${Number(state.camera.resolutionWidthPx).toLocaleString("en-GB")} × ${Number(state.camera.resolutionHeightPx).toLocaleString("en-GB")} px`,
        ]
      : null,
    camera ? ["Pixel pitch", `${camera.pixelSizeUm} µm native`] : null,
    [
      "Binning",
      `${state.binning}× (${result ? `${format(result.effectivePixelSizeUm, 2)} µm effective` : "effective grouping"})`,
    ],
    result
      ? [
          "Field",
          `${format(result.fieldOfViewDeg.horizontalDeg, 3)}° × ${format(result.fieldOfViewDeg.verticalDeg, 3)}°`,
        ]
      : null,
    result
      ? ["Image scale", `${format(result.imageScaleArcsecPerPixel, 3)}″/px`]
      : null,
  ].filter((fact): fact is string[] => fact !== null);

  return (
    <figure className={styles.figure} aria-labelledby="train-diagram-title">
      <figcaption>
        <p className="eyebrow">Visual train check</p>
        <h3 id="train-diagram-title">Selected equipment path</h3>
        <p className={styles.description}>{description}</p>
      </figcaption>
      <div
        className={styles.viewport}
        data-optical-family={family}
        role="img"
        aria-label={description}
        tabIndex={0}
      >
        <svg viewBox={`0 0 ${viewWidth} 225`} aria-hidden="true">
          <defs>
            <linearGradient id="tube" x1="0" x2="1">
              <stop offset="0" stopColor="#263846" />
              <stop offset="0.5" stopColor="#d7e1e4" />
              <stop offset="1" stopColor="#263846" />
            </linearGradient>
          </defs>
          <line
            className={styles.axis}
            x1="30"
            y1="96"
            x2={viewWidth - 30}
            y2="96"
          />
          <TelescopeSilhouette family={family} />
          <line className={styles.dimension} x1="28" y1="41" x2="28" y2="151" />
          <text
            className={styles.measurement}
            x="20"
            y="100"
            textAnchor="middle"
            transform="rotate(-90 20 100)"
          >
            {resolvedTelescope.apertureMm !== null
              ? `Ø ${format(resolvedTelescope.apertureMm, 1)} mm`
              : "aperture ?"}
          </text>
          <text x="190" y="177" textAnchor="middle">
            {telescope?.label ?? "Telescope incomplete"}
          </text>
          <text
            className={styles.measurement}
            x="190"
            y="198"
            textAnchor="middle"
          >
            {designLabel}
            {resolvedTelescope.nativeFocalLengthMm !== null
              ? ` · ${format(resolvedTelescope.nativeFocalLengthMm, 0)} mm`
              : ""}
          </text>
          {state.modifiers.map((modifier, index) => {
            const x = 370 + index * 140;
            return (
              <g key={modifier.instanceId}>
                <rect
                  className={styles.connector}
                  x={x - 18}
                  y="79"
                  width="20"
                  height="34"
                />
                <rect
                  className={styles.modifier}
                  x={x}
                  y="61"
                  width="88"
                  height="70"
                  rx="8"
                />
                <circle className={styles.glass} cx={x + 44} cy="96" r="23" />
                <text x={x + 44} y="158" textAnchor="middle">
                  {modifier.multiplier}×
                </text>
                <text
                  className={styles.measurement}
                  x={x + 44}
                  y="178"
                  textAnchor="middle"
                >
                  {modifier.modifierType}
                </text>
              </g>
            );
          })}
          <g>
            <rect
              className={styles.connector}
              x={cameraX - 30}
              y="78"
              width="31"
              height="36"
            />
            <rect
              className={styles.camera}
              x={cameraX}
              y="43"
              width="112"
              height="106"
              rx="12"
            />
            <rect
              className={styles.sensor}
              x={cameraX + 28}
              y="65"
              width="56"
              height="62"
              rx="4"
            />
            <text x={cameraX + 56} y="177" textAnchor="middle">
              {camera?.label ?? "Camera incomplete"}
            </text>
            <text
              className={styles.measurement}
              x={cameraX + 56}
              y="198"
              textAnchor="middle"
            >
              {camera
                ? `${camera.sensorWidthMm} × ${camera.sensorHeightMm} mm · ${camera.pixelSizeUm} µm`
                : "sensor incomplete"}
            </text>
          </g>
          <text
            className={styles.binning}
            x={viewWidth - 20}
            y="25"
            textAnchor="end"
          >
            {state.binning}× binning
          </text>
        </svg>
      </div>
      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
