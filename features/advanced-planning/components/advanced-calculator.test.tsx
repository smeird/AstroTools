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
});
