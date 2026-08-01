import Link from "next/link";

import type { AdvancedCalculatorKind } from "@/features/advanced-planning/advanced-calculator-definitions";

import styles from "./calculator-navigation.module.css";

type CalculatorNavigationKey =
  | "field-of-view"
  | "resolution-and-sampling"
  | "modifier-effects"
  | "sensor-tilt"
  | "backfocus-spacing"
  | "guiding-ratio"
  | "polar-alignment-drift"
  | "exposure-snr"
  | "mosaic-planning"
  | "dew-heater"
  | "storage-volume"
  | "calculations"
  | "equipment"
  | AdvancedCalculatorKind;

const links: ReadonlyArray<readonly [CalculatorNavigationKey, string, string]> =
  [
    ["equipment", "/equipment", "My Equipment"],
    ["calculations", "/calculations", "All Calculations"],
    ["field-of-view", "/calculators/field-of-view", "Field of View"],
    ["modifier-effects", "/calculators/modifier-effects", "Reducer & Barlow"],
    [
      "resolution-and-sampling",
      "/calculators/resolution-and-sampling",
      "Resolution & Sampling",
    ],
    ["sensor-tilt", "/calculators/sensor-tilt", "Sensor Tilt"],
    ["backfocus-spacing", "/calculators/backfocus-spacing", "Back-focus"],
    ["guiding-ratio", "/calculators/guiding-ratio", "Guiding Ratio"],
    [
      "polar-alignment-drift",
      "/calculators/polar-alignment-drift",
      "Polar Alignment",
    ],
    ["exposure-snr", "/calculators/exposure-snr", "Exposure & SNR"],
    [
      "optimal-sub-exposure",
      "/calculators/optimal-sub-exposure",
      "Sub-exposure",
    ],
    ["integration-planner", "/calculators/integration-planner", "Integration"],
    [
      "filter-exposure-planner",
      "/calculators/filter-exposure-planner",
      "Filters",
    ],
    ["star-saturation", "/calculators/star-saturation", "Star Saturation"],
    ["guiding-exposure", "/calculators/guiding-exposure", "Guide Exposure"],
    [
      "plate-solving-scale",
      "/calculators/plate-solving-scale",
      "Plate Solving",
    ],
    ["imaging-window", "/calculators/imaging-window", "Imaging Window"],
    [
      "atmospheric-extinction",
      "/calculators/atmospheric-extinction",
      "Extinction",
    ],
    ["mosaic-planning", "/calculators/mosaic-planning", "Mosaic Planning"],
    ["calibration-frames", "/calculators/calibration-frames", "Calibration"],
    ["drizzle-planner", "/calculators/drizzle-planner", "Drizzle"],
    ["field-rotation", "/calculators/field-rotation", "Field Rotation"],
    ["autofocus-planning", "/calculators/autofocus-planning", "Autofocus"],
    ["dew-heater", "/calculators/dew-heater", "Dew & Heater"],
    ["storage-volume", "/calculators/storage-volume", "Storage"],
  ];

export function CalculatorNavigation({
  active,
}: {
  active: CalculatorNavigationKey;
}) {
  return (
    <nav aria-label="Calculators" className={styles.navigation}>
      {links.map(([key, href, label]) => (
        <Link
          aria-current={active === key ? "page" : undefined}
          className={styles.link}
          href={href}
          key={key}
          prefetch={false}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
