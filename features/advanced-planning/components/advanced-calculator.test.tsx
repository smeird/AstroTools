import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  advancedCalculatorDefinitions,
  type AdvancedCalculatorKind,
} from "../advanced-calculator-definitions";
import { AdvancedCalculator } from "./advanced-calculator";

const kinds = Object.keys(
  advancedCalculatorDefinitions,
) as AdvancedCalculatorKind[];

describe("advanced calculator pages", () => {
  beforeEach(() => window.localStorage.clear());

  it.each(kinds)(
    "renders %s with inputs, results, formula and diagram",
    (kind) => {
      const definition = advancedCalculatorDefinitions[kind];
      const { container } = render(<AdvancedCalculator kind={kind} />);
      expect(
        screen.getByRole("heading", { level: 1, name: definition.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Governing equation" }),
      ).toBeInTheDocument();
      expect(
        container.querySelector(`[data-calculator-diagram="${kind}"]`),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(definition.fields[0]!.label),
      ).toBeInTheDocument();
      expect(container.querySelector(`#${kind}-results`)).toHaveTextContent(
        definition.resultTitle,
      );
    },
  );

  it("labels whether the saved rig contributes fields", async () => {
    window.localStorage.setItem(
      "astrotools.shared.imaging-train.v1",
      JSON.stringify({
        version: 1,
        rigName: "Garden Rig",
        telescopeLabel: "Test telescope",
        cameraLabel: "Test camera",
        nativeFocalLengthMm: "600",
        effectiveFocalLengthMm: "420",
        apertureMm: "80",
        opticalMultiplier: "0.7",
        pixelSizeUm: "3.76",
        binningFactor: "2",
        sensorWidthMm: "23.5",
        sensorHeightMm: "15.7",
        resolutionWidthPx: "6250",
        resolutionHeightPx: "4176",
      }),
    );

    const { unmount } = render(
      <AdvancedCalculator kind="integration-planner" />,
    );
    expect(await screen.findByTestId("shared-equipment")).toHaveTextContent(
      "specialist measurements that are not stored",
    );
    unmount();

    render(<AdvancedCalculator kind="plate-solving-scale" />);
    expect(await screen.findByTestId("shared-equipment")).toHaveTextContent(
      "Applied from equipment: effective focal length, effective pixel size, image width, image height.",
    );
    expect(screen.getByLabelText("Effective focal length")).toHaveValue(420);
  });
});
