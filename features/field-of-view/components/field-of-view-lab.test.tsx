import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { unavailableFieldOfViewCatalogue } from "../services/calculator-catalogue";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import { FieldOfViewLab } from "./field-of-view-lab";

function renderLab() {
  return render(<FieldOfViewLab catalogue={fieldOfViewCatalogueFixture} />);
}

describe("FieldOfViewLab", () => {
  it("renders the required input hierarchy, one restrained live result, and a visual equivalent", () => {
    renderLab();

    expect(
      screen.getByRole("heading", { name: "Configure the optical path" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Telescope preset" }),
    ).toHaveAccessibleDescription(/manufacturer or model/i);
    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveAccessibleDescription(/principal input/i);
    expect(
      screen.getByRole("spinbutton", { name: "Aperture" }),
    ).toHaveAccessibleDescription(/does not alter field of view/i);
    expect(
      screen.getByRole("combobox", { name: "Modifier preset" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Camera preset" }),
    ).toHaveAccessibleDescription(/manufacturer or model/i);
    expect(
      screen.getByRole("group", {
        name: "Binning or effective pixel grouping",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Seeing" })).toHaveAttribute(
      "aria-valuetext",
      "2.0 arcseconds",
    );
    expect(
      screen.getByRole("combobox", { name: "Astronomical target" }),
    ).toBeInTheDocument();

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0]).toHaveAttribute("aria-atomic", "true");
    expect(liveRegions[0]).toHaveTextContent("2.24° × 1.50°");

    expect(
      screen.getByRole("img", { name: /illustrative sensor frame/i }),
    ).toHaveAccessibleDescription(/no target scale is represented yet/i);
    expect(screen.getByText(/not a calibrated sky survey/i)).toBeVisible();

    const resultList = screen.getByText("Image scale").closest("dl");
    expect(resultList).toBeTruthy();
    expect(within(resultList as HTMLElement).getAllByRole("term")).toHaveLength(
      5,
    );
  });

  it("updates browser-only calculations and preserves raw invalid input", async () => {
    const user = userEvent.setup();
    renderLab();

    const focalLength = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });
    const primaryResult = screen.getByTestId("primary-result");

    await user.clear(focalLength);

    expect(focalLength).toHaveValue(null);
    expect(focalLength).toHaveAccessibleDescription(/10 to 20,000 mm/i);
    expect(primaryResult).toHaveTextContent(/complete the labelled setup/i);
    expect(screen.getByText(/results are unavailable/i)).toBeVisible();

    await user.type(focalLength, "1200");

    expect(focalLength).toHaveValue(1200);
    expect(primaryResult).toHaveTextContent("1.12° × 0.75°");
  });

  it("searches presets, marks edits as customised, preserves manual values, and restores the last telescope", async () => {
    const user = userEvent.setup();
    renderLab();
    const telescope = screen.getByRole("combobox", {
      name: "Telescope preset",
    });

    await user.clear(telescope);
    await user.type(telescope, "Celestron EdgeHD");
    await user.click(
      screen.getByRole("option", {
        name: "Celestron EdgeHD 8-inch Optical Tube Assembly",
      }),
    );

    const focalLength = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });
    expect(focalLength).toHaveValue(2032);
    expect(screen.getByTestId("telescope-status")).toHaveTextContent(
      /catalogue preset.*celestron edgehd/i,
    );

    await user.clear(focalLength);
    await user.type(focalLength, "1800");
    expect(screen.getByTestId("telescope-status")).toHaveTextContent(
      /customised preset/i,
    );

    const telescopeSource = screen.getByRole("group", {
      name: "Telescope source",
    });
    await user.click(
      within(telescopeSource).getByRole("radio", { name: "Manual" }),
    );
    expect(focalLength).toHaveValue(1800);
    expect(telescope).toBeDisabled();
    expect(screen.getByTestId("telescope-status")).toHaveTextContent(
      /manual values.*customised from.*celestron edgehd/i,
    );

    await user.click(
      screen.getByRole("button", {
        name: /restore celestron edgehd 8-inch optical tube assembly preset/i,
      }),
    );
    expect(focalLength).toHaveValue(2032);
    expect(telescope).toBeEnabled();
    expect(telescope).toHaveValue(
      "Celestron EdgeHD 8-inch Optical Tube Assembly",
    );
  });

  it("changes field of view from aperture only in explicit derived mode", async () => {
    const user = userEvent.setup();
    renderLab();
    const primaryResult = screen.getByTestId("primary-result");
    const aperture = screen.getByRole("spinbutton", { name: "Aperture" });
    const focalLength = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });
    const initialField = primaryResult.textContent;

    await user.clear(aperture);
    await user.type(aperture, "100");
    expect(primaryResult.textContent).toBe(initialField);
    expect(focalLength).toHaveValue(600);

    const focalMode = screen.getByRole("group", {
      name: "Focal length input",
    });
    await user.click(
      within(focalMode).getByRole("radio", {
        name: "Derive from focal ratio",
      }),
    );
    expect(focalLength).toHaveAttribute("readonly");

    await user.clear(aperture);
    await user.type(aperture, "120");
    expect(focalLength).toHaveValue(720);
    expect(primaryResult.textContent).not.toBe(initialField);
  });

  it("supports camera preset, manual, and reset semantics", async () => {
    const user = userEvent.setup();
    renderLab();
    const camera = screen.getByRole("combobox", { name: "Camera preset" });

    await user.clear(camera);
    await user.type(camera, "ASI533");
    await user.click(screen.getByRole("option", { name: "ZWO ASI533MC Pro" }));

    const sensorWidth = screen.getByRole("spinbutton", {
      name: "Sensor width",
    });
    expect(sensorWidth).toHaveValue(11.31);

    await user.clear(sensorWidth);
    await user.type(sensorWidth, "12");
    expect(screen.getByTestId("camera-status")).toHaveTextContent(
      /customised preset/i,
    );

    const cameraSource = screen.getByRole("group", { name: "Camera source" });
    await user.click(
      within(cameraSource).getByRole("radio", { name: "Manual" }),
    );
    expect(sensorWidth).toHaveValue(12);
    expect(screen.getByTestId("camera-status")).toHaveTextContent(
      /manual values.*customised from.*zwo asi533/i,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Restore ZWO ASI533MC Pro preset",
      }),
    );
    expect(sensorWidth).toHaveValue(11.31);
    expect(camera).toBeEnabled();
  });

  it("applies, identifies, restores, and removes optical modifiers", async () => {
    const user = userEvent.setup();
    renderLab();
    const modifier = screen.getByRole("combobox", {
      name: "Modifier preset",
    });

    await user.type(modifier, "Sky-Watcher");
    await user.click(
      screen.getByRole("option", {
        name: "Sky-Watcher Reducer/Corrector 0.85x for Evostar 80",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add selected modifier" }),
    );

    expect(screen.getByText("510.00 mm focal length")).toBeVisible();
    expect(
      screen.getByText("Changes effective focal length and focal ratio: yes."),
    ).toBeVisible();
    const multiplier = screen.getByRole("spinbutton", {
      name: "Magnification factor",
    });
    await user.clear(multiplier);
    await user.type(multiplier, "2");

    expect(screen.getByText("1200.00 mm focal length")).toBeVisible();
    expect(screen.getByText("Customised preset")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: /restore sky-watcher reducer\/corrector.*multiplier/i,
      }),
    );
    expect(multiplier).toHaveValue(0.85);
    expect(screen.getByText("510.00 mm focal length")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: /remove sky-watcher reducer\/corrector/i,
      }),
    );
    expect(screen.getByText("600.00 mm focal length")).toBeVisible();
    expect(screen.getByText("No optical modifiers applied.")).toBeVisible();

    const addManual = screen.getByRole("button", {
      name: "Add manual modifier",
    });
    await user.click(addManual);
    await user.click(
      within(screen.getByRole("group", { name: "Modifier type" })).getByRole(
        "radio",
        { name: "Barlow" },
      ),
    );
    expect(screen.getByText("Manual Barlow")).toBeVisible();

    const removeManual = screen.getByRole("button", {
      name: "Remove Manual optical modifier",
    });
    await user.click(removeManual);
    expect(addManual).toHaveFocus();
  });

  it("updates the qualified sampling assessment from keyboard controls", async () => {
    const user = userEvent.setup();
    renderLab();

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
    renderLab();

    const controls = screen.getByRole("heading", {
      name: "Configure the optical path",
    }).parentElement?.parentElement;
    const primaryResult = screen.getByTestId("primary-result");
    const visual = screen.getByRole("heading", {
      name: "Framing workspace",
    }).parentElement?.parentElement;
    const results = screen.getByRole("heading", {
      name: "Imaging results",
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
  });

  it("falls back explicitly to complete manual entry when MySQL is unavailable", () => {
    render(<FieldOfViewLab catalogue={unavailableFieldOfViewCatalogue()} />);

    expect(
      screen.getByText(/equipment catalogue is temporarily unavailable/i),
    ).toBeVisible();
    expect(
      within(screen.getByRole("group", { name: "Telescope source" })).getByRole(
        "radio",
        { name: "Manual" },
      ),
    ).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Telescope preset" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveValue(null);
    expect(
      screen.getByRole("button", { name: "No telescope preset to restore" }),
    ).toBeDisabled();
  });
});
