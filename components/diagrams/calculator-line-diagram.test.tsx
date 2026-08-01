import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CalculatorLineDiagram,
  type CalculatorDiagramKind,
} from "./calculator-line-diagram";

const kinds: CalculatorDiagramKind[] = [
  "field-of-view",
  "modifier-effects",
  "resolution-sampling",
  "sensor-tilt",
  "backfocus-spacing",
  "guiding-ratio",
  "polar-alignment",
  "exposure-snr",
  "mosaic-planning",
  "dew-heater",
  "storage-volume",
  "optimal-sub-exposure",
  "integration-planner",
  "filter-exposure-planner",
  "star-saturation",
  "guiding-exposure",
  "plate-solving-scale",
  "imaging-window",
  "atmospheric-extinction",
  "calibration-frames",
  "drizzle-planner",
  "field-rotation",
  "autofocus-planning",
];

describe("calculator line diagrams", () => {
  it.each(kinds)("renders an accessible %s technical figure", (kind) => {
    const { container } = render(<CalculatorLineDiagram kind={kind} />);
    expect(
      container.querySelector(`[data-calculator-diagram="${kind}"]`),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/.+/);
  });
});
