import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CalculatorExplainer } from "./calculator-explainer";
import { EquipmentInheritanceNotice } from "./equipment-inheritance-notice";
import { ViewModeToggle } from "./view-mode-toggle";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.viewMode;
  document.documentElement.style.removeProperty("color-scheme");
  document
    .querySelector('meta[name="theme-color"][data-astrotools-view-mode]')
    ?.remove();
});
beforeEach(() => window.localStorage.clear());

describe("calculator explanation and equipment context", () => {
  it("presents the registered question and formula in plain language", () => {
    render(
      <CalculatorExplainer
        guidance="Use the effective imaging train."
        slug="resolution-and-sampling"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "What this calculator does" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Am I over- or under-sampled?"),
    ).toBeInTheDocument();
    expect(screen.getByText("In words:")).toBeInTheDocument();
    expect(
      screen.getByText("Use the effective imaging train."),
    ).toBeInTheDocument();
  });

  it("distinguishes inherited values from specialist-only measurements", () => {
    const { rerender } = render(
      <EquipmentInheritanceNotice
        appliedFields={["aperture", "pixel pitch"]}
        equipmentLabel="Garden Rig"
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Applied from equipment: aperture, pixel pitch.",
    );

    rerender(
      <EquipmentInheritanceNotice
        appliedFields={[]}
        equipmentLabel="Garden Rig"
      />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "specialist measurements that are not stored",
    );
  });

  it("names the format-switch action and updates browser colour metadata", async () => {
    const user = userEvent.setup();
    render(<ViewModeToggle />);
    const button = await screen.findByRole("button", {
      name: "Switch to academic view",
    });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to presentation view" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute(
      "data-view-mode",
      "academic",
    );
    expect(
      document.querySelector(
        'meta[name="theme-color"][data-astrotools-view-mode]',
      ),
    ).toHaveAttribute("content", "#ffffff");
  });
});
