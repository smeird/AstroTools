import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EquationCard, MathExpression } from "./index";

afterEach(cleanup);

describe("MathExpression", () => {
  it("renders caller-supplied structured MathML beneath a visible caption", () => {
    const { container } = render(
      <MathExpression label="Symbolic equation">
        <mrow>
          <mi>f</mi>
          <mo>=</mo>
          <mfrac>
            <mi>d</mi>
            <mn>2</mn>
          </mfrac>
        </mrow>
      </MathExpression>,
    );

    expect(screen.getByText("Symbolic equation")).toBeVisible();
    const math = container.querySelector("math");
    expect(math).not.toBeNull();
    expect(math?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(math?.getAttribute("display")).toBe("block");
    expect(math?.hasAttribute("aria-label")).toBe(false);
    expect(math?.hasAttribute("aria-labelledby")).toBe(false);
    expect(math?.querySelector("mfrac")).not.toBeNull();

    const viewport = math?.parentElement as HTMLDivElement;
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).toHaveAttribute("role", "group");
    expect(viewport).toHaveAccessibleName(
      "Symbolic equation; scroll horizontally if needed",
    );

    Object.defineProperties(viewport, {
      clientWidth: { value: 100 },
      scrollWidth: { value: 200 },
    });
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(viewport.scrollLeft).toBe(40);
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(viewport.scrollLeft).toBe(0);
  });
});

describe("EquationCard", () => {
  it("presents equations, prose, variables, a final result, and interpretation semantically", () => {
    render(
      <EquationCard
        finalResult={<p>1.35 degrees</p>}
        interpretation={
          <p>The horizontal angle captured by the current optical system.</p>
        }
        inWords={<p>Sensor width divided by focal length sets the field.</p>}
        title="Horizontal field of view"
        variables={[
          {
            symbol: "θx",
            meaning: "Horizontal field of view",
            unit: "degrees",
          },
          {
            symbol: "dₓ",
            meaning: "Sensor width",
            unit: "millimetres",
          },
          {
            symbol: "π",
            meaning: "The circle constant pi",
            unit: "dimensionless",
          },
        ]}
      >
        <MathExpression label="Symbolic equation">
          <mrow>
            <msub>
              <mi>θ</mi>
              <mi>x</mi>
            </msub>
            <mo>=</mo>
            <mn>1.35</mn>
            <mo>°</mo>
          </mrow>
        </MathExpression>
        <MathExpression label="Current values">
          <mrow>
            <mn>23.5</mn>
            <mtext> mm</mtext>
          </mrow>
        </MathExpression>
      </EquationCard>,
    );

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Horizontal field of view",
      }),
    ).toBeVisible();
    for (const heading of [
      "In words",
      "Variables and units",
      "Final result",
      "Interpretation",
    ]) {
      expect(
        screen.getByRole("heading", { level: 4, name: heading }),
      ).toBeVisible();
    }

    expect(
      screen.getByText("Sensor width divided by focal length sets the field."),
    ).toBeVisible();
    expect(screen.getByText("1.35 degrees")).toBeVisible();
    expect(
      screen.getByText(
        "The horizontal angle captured by the current optical system.",
      ),
    ).toBeVisible();

    const terms = screen.getAllByRole("term");
    const definitions = screen.getAllByRole("definition");
    expect(terms).toHaveLength(3);
    expect(definitions).toHaveLength(3);
    expect(terms[0]).toHaveTextContent("θx");
    expect(definitions[0]).toHaveTextContent(
      "Horizontal field of viewUnit: degrees",
    );
    expect(definitions[2]).toHaveTextContent(
      "The circle constant piUnit: dimensionless",
    );
    expect(screen.getAllByText("Symbolic equation")).toHaveLength(1);
    expect(screen.getAllByText("Current values")).toHaveLength(1);
    expect(document.querySelectorAll("math")).toHaveLength(2);
  });
});
