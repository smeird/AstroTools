import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("home page", () => {
  it("introduces the first calculator with semantic navigation", () => {
    render(<HomePage />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /skip to main content/i }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /plan the frame before the sky gets dark/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open the field lab/i }),
    ).toHaveAttribute("href", "/calculators/field-of-view");
    expect(
      screen.getByRole("link", { name: /check guiding ratio/i }),
    ).toHaveAttribute("href", "/calculators/guiding-ratio");
    expect(
      screen.getByRole("link", { name: /diagnose polar-alignment drift/i }),
    ).toHaveAttribute("href", "/calculators/polar-alignment-drift");
    expect(
      screen.getByRole("link", { name: /estimate exposure and snr/i }),
    ).toHaveAttribute("href", "/calculators/exposure-snr");
    expect(
      screen.getByRole("link", { name: /plan a mosaic/i }),
    ).toHaveAttribute("href", "/calculators/mosaic-planning");
    expect(
      screen.getByRole("link", { name: /plan dew control/i }),
    ).toHaveAttribute("href", "/calculators/dew-heater");
    expect(
      screen.getByRole("link", { name: /estimate storage needs/i }),
    ).toHaveAttribute("href", "/calculators/storage-volume");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
