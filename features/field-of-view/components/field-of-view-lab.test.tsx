import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FieldOfViewLab } from "./field-of-view-lab";

describe("FieldOfViewLab", () => {
  it("renders labelled controls, one restrained live result, and a visual equivalent", () => {
    render(<FieldOfViewLab />);

    expect(
      screen.getByRole("heading", { name: "Shape the optical path" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Reference sensor" }),
    ).toHaveAccessibleDescription(/type to filter/i);
    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveAccessibleDescription(/principal input/i);
    expect(
      screen.getByRole("spinbutton", { name: "Aperture" }),
    ).toHaveAccessibleDescription(/calculate the focal ratio/i);
    expect(screen.getByRole("group", { name: "Binning" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Seeing" })).toHaveAttribute(
      "aria-valuetext",
      "2.0 arcseconds",
    );

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveAttribute("aria-live", "polite");
    expect(liveRegions[0]).toHaveAttribute("aria-atomic", "true");
    expect(liveRegions[0]).toHaveTextContent("2.24° × 1.50°");

    expect(
      screen.getByRole("img", { name: /illustrative sensor frame/i }),
    ).toHaveAccessibleDescription(/not a calibrated sky survey/i);
    expect(screen.getByText(/no astronomical target scale/i)).toBeVisible();
  });

  it("updates browser-only calculations and preserves raw invalid input", async () => {
    const user = userEvent.setup();
    render(<FieldOfViewLab />);

    const focalLength = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });
    const primaryResult = screen.getByTestId("primary-result");

    await user.clear(focalLength);

    expect(focalLength).toHaveValue(null);
    expect(focalLength).toHaveAccessibleDescription(/10 to 20,000 mm/i);
    expect(primaryResult).toHaveTextContent(/complete the reference setup/i);
    expect(screen.getByText(/results are unavailable/i)).toBeVisible();

    await user.type(focalLength, "1200");

    expect(focalLength).toHaveValue(1200);
    expect(primaryResult).toHaveTextContent("1.12° × 0.75°");
  });

  it("updates the qualified sampling assessment from keyboard controls", async () => {
    const user = userEvent.setup();
    render(<FieldOfViewLab />);

    expect(
      screen.getByText("Likely undersampled for the stated seeing"),
    ).toBeVisible();

    const seeing = screen.getByRole("slider", { name: "Seeing" });
    fireEvent.change(seeing, { target: { value: "5" } });

    expect(seeing).toHaveValue("5");
    expect(
      screen.getByText("Broadly appropriate for many conditions"),
    ).toBeVisible();

    const oneByOne = screen.getByRole("radio", { name: "1×" });
    oneByOne.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "2×" })).toBeChecked();
    expect(
      screen.getByText("Likely undersampled for the stated seeing"),
    ).toBeVisible();
  });

  it("keeps mobile reading order logical before CSS changes presentation", () => {
    render(<FieldOfViewLab />);

    const controls = screen.getByRole("heading", {
      name: "Shape the optical path",
    }).parentElement?.parentElement;
    const primaryResult = screen.getByTestId("primary-result");
    const visual = screen.getByRole("heading", {
      name: "Framing workspace",
    }).parentElement?.parentElement;
    const results = screen.getByRole("heading", {
      name: "Reference results",
    }).parentElement?.parentElement;

    expect(controls).toBeTruthy();
    expect(visual).toBeTruthy();
    expect(results).toBeTruthy();
    expect(controls?.compareDocumentPosition(primaryResult) ?? 0).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(primaryResult.compareDocumentPosition(visual as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(visual?.compareDocumentPosition(results as Node) ?? 0).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    const resultList = screen.getByText("Image scale").closest("dl");
    expect(resultList).toBeTruthy();
    expect(within(resultList as HTMLElement).getAllByRole("term")).toHaveLength(
      4,
    );
  });
});
