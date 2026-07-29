import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResultCard, ResultGrid } from "./result-card";

afterEach(cleanup);

describe("ResultGrid", () => {
  it("presents result cards as semantic terms and definitions with complete text", () => {
    render(
      <ResultGrid>
        <ResultCard
          label="Horizontal field"
          secondary="81.0 arcminutes"
          value="1.35 degrees"
        />
        <ResultCard
          interpretation="Tracking, focus, optics, processing, and target type also matter."
          label="Sampling"
          secondary="2.42 pixels per seeing FWHM"
          statusText="Broadly appropriate for many conditions"
          value="0.83 arcseconds per pixel"
        />
      </ResultGrid>,
    );

    const terms = screen.getAllByRole("term");
    const definitions = screen.getAllByRole("definition");

    expect(terms).toHaveLength(2);
    expect(definitions).toHaveLength(2);
    expect(terms[0]?.tagName).toBe("DT");
    expect(definitions[0]?.tagName).toBe("DD");
    expect(terms[0]).toHaveTextContent("Horizontal field");
    expect(definitions[0]).toHaveTextContent("1.35 degrees");
    expect(definitions[0]).toHaveTextContent("81.0 arcminutes");
    expect(terms[1]).toHaveTextContent("Sampling");
    expect(definitions[1]).toHaveTextContent("0.83 arcseconds per pixel");
    expect(definitions[1]).toHaveTextContent(
      "Broadly appropriate for many conditions",
    );
    expect(definitions[1]).toHaveTextContent("2.42 pixels per seeing FWHM");
    expect(definitions[1]).toHaveTextContent(
      "Tracking, focus, optics, processing, and target type also matter.",
    );

    const grid = terms[0]?.closest("dl");
    expect(grid).not.toBeNull();
    expect(within(grid as HTMLElement).getAllByRole("definition")).toHaveLength(
      2,
    );
  });
});
