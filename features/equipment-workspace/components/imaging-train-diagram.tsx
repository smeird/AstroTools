import type { EquipmentConfigurationState } from "@/features/field-of-view/model/equipment-configuration";
import {
  cameraSelectionFromConfiguration,
  telescopeSelectionFromConfiguration,
} from "@/features/shared-equipment/telescope-selection";

import styles from "./imaging-train-diagram.module.css";

export function ImagingTrainDiagram({
  state,
}: {
  state: EquipmentConfigurationState;
}) {
  const telescope = telescopeSelectionFromConfiguration(state.telescope);
  const camera = cameraSelectionFromConfiguration(state.camera);
  const parts = [
    telescope?.label ?? "Incomplete telescope",
    ...state.modifiers.map((modifier) => modifier.label),
    camera?.label ?? "Incomplete camera",
  ];
  const description = `${parts.join(" then ")}; ${state.binning}× binning.`;
  const modifierCount = state.modifiers.length;
  const viewWidth = 620 + modifierCount * 130;
  const cameraX = 470 + modifierCount * 130;

  return (
    <figure className={styles.figure} aria-labelledby="train-diagram-title">
      <figcaption>
        <p className="eyebrow">Visual train check</p>
        <h3 id="train-diagram-title">Selected equipment path</h3>
        <p className={styles.description}>{description}</p>
      </figcaption>
      <div
        className={styles.viewport}
        role="img"
        aria-label={description}
        tabIndex={0}
      >
        <svg viewBox={`0 0 ${viewWidth} 190`} aria-hidden="true">
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
            y1="92"
            x2={viewWidth - 30}
            y2="92"
          />
          <g>
            <ellipse className={styles.glass} cx="54" cy="92" rx="20" ry="55" />
            <path
              className={styles.scope}
              d="M54 42 H310 L350 63 V121 L310 142 H54 Z"
            />
            <rect
              className={styles.ring}
              x="292"
              y="51"
              width="18"
              height="82"
              rx="4"
            />
            <text x="180" y="176" textAnchor="middle">
              {telescope?.label ?? "Telescope incomplete"}
            </text>
          </g>
          {state.modifiers.map((modifier, index) => {
            const x = 365 + index * 130;
            return (
              <g key={modifier.instanceId}>
                <rect
                  className={styles.connector}
                  x={x - 18}
                  y="75"
                  width="20"
                  height="34"
                />
                <rect
                  className={styles.modifier}
                  x={x}
                  y="57"
                  width="82"
                  height="70"
                  rx="8"
                />
                <circle className={styles.glass} cx={x + 41} cy="92" r="23" />
                <text x={x + 41} y="151" textAnchor="middle">
                  {modifier.multiplier}×
                </text>
                <text x={x + 41} y="174" textAnchor="middle">
                  {modifier.label}
                </text>
              </g>
            );
          })}
          <g>
            <rect
              className={styles.connector}
              x={cameraX - 30}
              y="74"
              width="31"
              height="36"
            />
            <rect
              className={styles.camera}
              x={cameraX}
              y="39"
              width="105"
              height="106"
              rx="12"
            />
            <circle
              className={styles.sensor}
              cx={cameraX + 52.5}
              cy="92"
              r="28"
            />
            <text x={cameraX + 52.5} y="176" textAnchor="middle">
              {camera?.label ?? "Camera incomplete"}
            </text>
          </g>
          <text
            className={styles.binning}
            x={viewWidth - 20}
            y="24"
            textAnchor="end"
          >
            {state.binning}× binning
          </text>
        </svg>
      </div>
    </figure>
  );
}
