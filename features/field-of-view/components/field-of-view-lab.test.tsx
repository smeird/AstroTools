import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { unavailableFieldOfViewCatalogue } from "../services/calculator-catalogue";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import { COMPLEX_FIELD_OF_VIEW_SHARE_V1 } from "@/tests/fixtures/field-of-view-shareable-state-v1";
import { parseFieldOfViewShareState } from "../schemas/shareable-state";
import { FieldOfViewLab } from "./field-of-view-lab";
import { formatSignedAngularMargin } from "./target-framing-simulator";

function renderLab(catalogue = fieldOfViewCatalogueFixture) {
  return render(<FieldOfViewLab catalogue={catalogue} />);
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("formatSignedAngularMargin", () => {
  it.each([
    { valueDeg: 1.234, expected: "1.23°" },
    { valueDeg: -0.5, expected: "-30′" },
    { valueDeg: 0.02, expected: "1.2′" },
    { valueDeg: -0.004, expected: "-14.4″" },
    { valueDeg: -0.0001, expected: "-0.36″" },
    { valueDeg: -0, expected: "0°" },
  ])("formats $valueDeg degrees as $expected", ({ valueDeg, expected }) => {
    expect(formatSignedAngularMargin(valueDeg)).toBe(expected);
  });
});

describe("FieldOfViewLab", () => {
  it("renders the required input hierarchy, one restrained live result, and a proportional visual equivalent", () => {
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
    expect(liveRegions).toHaveLength(2);
    expect(liveRegions[0]).toHaveAttribute("aria-atomic", "true");
    expect(liveRegions[0]).toHaveTextContent("2.24° × 1.50°");
    expect(liveRegions[1]).toHaveTextContent("");
    expect(screen.getByTestId("framing-live-status")).toHaveTextContent(
      /andromeda galaxy \(m31\): extends beyond the centred sensor frame/i,
    );
    expect(screen.getByTestId("framing-fit-status")).toHaveTextContent(
      "Centred total clearance: -37.8′ horizontal, -1.90° vertical.",
    );

    expect(
      screen.getByRole("heading", { name: "Target framing simulator" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: /proportional framing simulator for andromeda galaxy/i,
      }),
    ).toHaveAccessibleDescription(
      /target extent 3\.33° by 1\.18°.*display zoom 1\.00 times changes only this view/i,
    );
    expect(screen.getByText(/not a calibrated sky survey/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Asset licence" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/",
    );
    expect(
      screen.getByRole("link", { name: "Angular-size source" }),
    ).toHaveAttribute("href", "https://example.com/m31");

    const currentField = screen.getByRole("region", {
      name: "Current field",
    });
    const imagingResults = screen
      .getByRole("heading", { name: "Imaging results" })
      .closest("section");
    expect(imagingResults).toBeTruthy();
    expect(within(currentField).getAllByRole("term")).toHaveLength(2);
    expect(
      within(imagingResults as HTMLElement).getAllByRole("term"),
    ).toHaveLength(3);
    expect(
      within(currentField).getByText("1.29 arcseconds per output pixel"),
    ).toBeInTheDocument();
    expect(
      within(currentField).getByText(
        "Equivalent output pitch 3.76 micrometres",
      ),
    ).toBeInTheDocument();
    expect(
      within(imagingResults as HTMLElement).getByText(
        "2.0 arcseconds stated seeing",
      ),
    ).toBeInTheDocument();
  });

  it("hydrates a complete shared state before the first client render", () => {
    const shared = parseFieldOfViewShareState(
      new URLSearchParams(COMPLEX_FIELD_OF_VIEW_SHARE_V1),
      fieldOfViewCatalogueFixture,
    );

    render(
      <FieldOfViewLab
        catalogue={fieldOfViewCatalogueFixture}
        initialConfiguration={shared.state}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Telescope preset" }),
    ).toHaveValue("Celestron EdgeHD 8-inch Optical Tube Assembly");
    expect(
      screen.getByRole("radio", { name: "Manual", checked: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveValue(1800);
    expect(screen.getByRole("combobox", { name: "Camera preset" })).toHaveValue(
      "ZWO ASI533MC Pro",
    );
    expect(
      screen.getByRole("radio", { name: "Pixel resolution" }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "2×" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "Seeing" })).toHaveValue("1.8");
    expect(
      screen.getByRole("combobox", { name: "Astronomical target" }),
    ).toHaveValue("Orion Nebula · M42");
    expect(screen.getByRole("radio", { name: "Inches (in)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Portrait" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "Display zoom" })).toHaveValue(
      "2.5",
    );
    expect(screen.getByRole("slider", { name: "Frame rotation" })).toHaveValue(
      "35",
    );
    expect(
      screen.getByText("Customised preset", { exact: true }),
    ).toBeVisible();
  });

  it("copies the latest canonical state and keeps focus on the action", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderLab();

    const focalLength = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });
    await user.clear(focalLength);
    await user.type(focalLength, "1200");
    const copyLink = screen.getByRole("button", { name: "Copy link" });
    await user.click(copyLink);

    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedUrl = new URL(String(writeText.mock.calls[0]?.[0]));
    expect(copiedUrl.pathname).toBe("/calculators/field-of-view");
    expect(copiedUrl.searchParams.get("v")).toBe("1");
    expect(copiedUrl.searchParams.get("f")).toBe("1200");
    expect(copiedUrl.searchParams.has("email")).toBe(false);
    expect(copyLink).toHaveFocus();
    expect(
      screen.getByText("Link copied. It includes the current configuration."),
    ).toBeVisible();

    const status = document.getElementById("share-configuration-status")!;
    const firstAnnouncement = status.firstElementChild;
    await user.click(copyLink);
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(status.firstElementChild).not.toBe(firstAnnouncement);
  });

  it("still copies when address-bar synchronization is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {
        throw new DOMException("History unavailable", "SecurityError");
      });

    try {
      renderLab();
      await user.click(screen.getByRole("button", { name: "Copy link" }));

      expect(writeText).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText("Link copied. It includes the current configuration."),
      ).toBeVisible();
    } finally {
      replaceState.mockRestore();
    }
  });

  it("provides a selectable fallback when clipboard access fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderLab();

    const copyLink = screen.getByRole("button", { name: "Copy link" });
    await user.click(copyLink);

    expect(copyLink).toHaveFocus();
    expect(
      screen.getByText("Could not copy the link. Select and copy it below."),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Configuration link" }),
    ).toHaveAttribute("readonly");
  });

  it("reports an invalid current form without disabling the copy action", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderLab();

    await user.clear(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    );
    const copyLink = screen.getByRole("button", { name: "Copy link" });
    expect(copyLink).toBeEnabled();
    await user.click(copyLink);

    expect(writeText).not.toHaveBeenCalled();
    expect(copyLink).toHaveFocus();
    expect(
      screen.getByText(
        "Complete the labelled required fields before copying a link.",
      ),
    ).toBeVisible();
  });

  it("copies a valid visible camera setup after normalizing an inactive invalid draft", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderLab();

    const geometry = screen.getByRole("group", { name: "Sensor size source" });
    await user.click(
      within(geometry).getByRole("radio", { name: "Pixel resolution" }),
    );
    await user.clear(
      screen.getByRole("spinbutton", { name: "Resolution width" }),
    );
    await user.click(
      within(geometry).getByRole("radio", { name: "Physical dimensions" }),
    );

    expect(screen.getByTestId("camera-status")).toHaveTextContent(
      /catalogue preset/i,
    );
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(
      new URL(String(writeText.mock.calls[0]?.[0])).searchParams.has("rw"),
    ).toBe(false);
    expect(
      screen.getByText("Link copied. It includes the current configuration."),
    ).toBeVisible();
  });

  it("renders structured MathML with every explanatory layer outside the live region", () => {
    renderLab();

    const panel = screen.getByTestId("calculation-equations");
    for (const title of [
      "Effective optics",
      "Sensor geometry",
      "Exact field of view",
      "Image scale",
      "Seeing and sampling",
    ]) {
      expect(
        within(panel).getByRole("heading", { level: 3, name: title }),
      ).toBeVisible();
    }

    for (const sectionTitle of [
      "In words",
      "Variables and units",
      "Final result",
      "Interpretation",
    ]) {
      expect(
        within(panel).getAllByRole("heading", {
          level: 4,
          name: sectionTitle,
        }),
      ).toHaveLength(5);
    }

    const equations = panel.querySelectorAll("math");
    expect(equations).toHaveLength(18);
    for (const equation of equations) {
      expect(equation.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
      expect(equation.getAttribute("display")).toBe("block");
      expect(equation.hasAttribute("aria-label")).toBe(false);
      expect(equation.hasAttribute("aria-labelledby")).toBe(false);
      expect(equation.closest('[aria-live="polite"]')).toBeNull();
    }

    expect(panel.querySelector("mfrac")).not.toBeNull();
    expect(panel.querySelector("msqrt")).not.toBeNull();
    expect(panel.querySelector("mtable")).not.toBeNull();
    expect(panel).toHaveTextContent("arctan");
    expect(panel).not.toHaveTextContent("tan⁻¹");
    expect(panel).toHaveTextContent(
      /small-angle approximation is shown only for education and is not used/i,
    );
    expect(
      within(panel).getByText("Qualified sampling assessment — current values"),
    ).toBeVisible();
    expect(
      within(panel).getByRole("group", {
        name: "Physical display units",
      }),
    ).toHaveAccessibleDescription(/canonical inputs and calculations remain/i);
  });

  it("changes only physical displays and substitutions when inches are selected", async () => {
    const user = userEvent.setup();
    renderLab();

    const primaryResult = screen.getByTestId("primary-result");
    const diagram = screen.getByRole("img", {
      name: /proportional framing simulator/i,
    });
    const imageScaleCard = screen.getByText("Image scale", {
      selector: "dt",
    }).parentElement;
    const samplingCard = screen.getByText("Sampling", {
      selector: "dt",
    }).parentElement;
    const before = {
      primary: primaryResult.textContent,
      imageScale: imageScaleCard?.textContent,
      sampling: samplingCard?.textContent,
      fieldWidth: diagram.getAttribute("data-field-width-deg"),
      fieldHeight: diagram.getAttribute("data-field-height-deg"),
    };

    await user.click(screen.getByRole("radio", { name: "Inches (in)" }));

    expect(primaryResult.textContent).toBe(before.primary);
    expect(imageScaleCard?.textContent).toBe(before.imageScale);
    expect(samplingCard?.textContent).toBe(before.sampling);
    expect(diagram).toHaveAttribute("data-field-width-deg", before.fieldWidth);
    expect(diagram).toHaveAttribute(
      "data-field-height-deg",
      before.fieldHeight,
    );
    expect(
      screen.getByText("Sensor size", { selector: "dt" }).parentElement,
    ).toHaveTextContent("0.925 × 0.618 in");
    expect(
      screen.getByText("Effective optics", { selector: "dt" }).parentElement,
    ).toHaveTextContent("23.622 in focal length");
    expect(screen.getByTestId("calculation-equations")).toHaveTextContent(
      "25.4",
    );
    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveValue(600);
    expect(screen.getByRole("spinbutton", { name: "Aperture" })).toHaveValue(
      80,
    );
    expect(screen.queryByText("Customised preset")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Millimetres (mm)" }));
    expect(
      screen.getByText("Sensor size", { selector: "dt" }).parentElement,
    ).toHaveTextContent("23.50 × 15.70 mm");
    expect(primaryResult.textContent).toBe(before.primary);
  });

  it("shows only the sensor derivation that supplies the active calculation", async () => {
    const user = userEvent.setup();
    renderLab();

    expect(
      screen.getByText("Supplied active dimensions — current values"),
    ).toBeVisible();
    expect(
      screen.queryByText("Sensor width and height — symbolic"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Pixel resolution" }));

    expect(
      screen.queryByText("Supplied active dimensions — current values"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Sensor width and height — symbolic"),
    ).toBeVisible();
    expect(screen.getByTestId("calculation-equations")).toHaveTextContent(
      "1000",
    );

    await user.click(screen.getByRole("radio", { name: "Inches (in)" }));
    expect(screen.getByTestId("calculation-equations")).toHaveTextContent(
      "25400",
    );
  });

  it("shows focal-length derivation only after the explicit derived mode is selected", async () => {
    const user = userEvent.setup();
    renderLab();

    expect(
      screen.queryByText("Derived native focal length — symbolic"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/in direct-focal-length mode, aperture alone/i),
    ).toBeVisible();

    await user.click(
      screen.getByRole("radio", { name: "Derive from focal ratio" }),
    );

    expect(
      screen.getByText("Derived native focal length — symbolic"),
    ).toBeVisible();
    expect(
      screen.getByText("Derived native focal length — current values"),
    ).toBeVisible();
    expect(
      screen.getByText(
        /in derived-focal-length mode, aperture changes the field only because/i,
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/in direct-focal-length mode, aperture alone/i),
    ).not.toBeInTheDocument();
  });

  it("keeps optical results and angular proportions invariant under display zoom", () => {
    renderLab();
    const diagram = screen.getByRole("img", {
      name: /proportional framing simulator/i,
    });
    const zoom = screen.getByRole("slider", { name: "Display zoom" });
    const primaryResult = screen.getByTestId("primary-result");
    const fitStatus = screen.getByTestId("framing-fit-status");
    const framingLiveStatus = screen.getByTestId("framing-live-status");
    const initial = {
      fieldWidth: diagram.getAttribute("data-field-width-deg"),
      fieldHeight: diagram.getAttribute("data-field-height-deg"),
      targetWidth: diagram.getAttribute("data-target-width-deg"),
      targetHeight: diagram.getAttribute("data-target-height-deg"),
      fieldResult: primaryResult.textContent,
      fit: fitStatus.textContent,
      liveFit: framingLiveStatus.textContent,
      viewBox: diagram.getAttribute("viewBox"),
    };

    fireEvent.change(zoom, { target: { value: "2" } });

    expect(zoom).toHaveAttribute("aria-valuetext", "2.00 times; display only");
    expect(diagram.getAttribute("viewBox")).not.toBe(initial.viewBox);
    expect(diagram).toHaveAttribute("data-field-width-deg", initial.fieldWidth);
    expect(diagram).toHaveAttribute(
      "data-field-height-deg",
      initial.fieldHeight,
    );
    expect(diagram).toHaveAttribute(
      "data-target-width-deg",
      initial.targetWidth,
    );
    expect(diagram).toHaveAttribute(
      "data-target-height-deg",
      initial.targetHeight,
    );
    expect(primaryResult.textContent).toBe(initial.fieldResult);
    expect(fitStatus.textContent).toBe(initial.fit);
    expect(screen.getByTestId("framing-live-status")).toBe(framingLiveStatus);
    expect(framingLiveStatus.textContent).toBe(initial.liveFit);
  });

  it("exposes a catalogue framing qualification in both visible and non-visual output", () => {
    const framingNote =
      "Planning proxy based on a cited image frame; not a calibrated target boundary.";
    renderLab({
      ...fieldOfViewCatalogueFixture,
      targets: fieldOfViewCatalogueFixture.targets.map((target) =>
        target.slug === "m31-andromeda-galaxy"
          ? { ...target, framingNote }
          : target,
      ),
    });

    expect(screen.getByTestId("target-framing-note")).toHaveTextContent(
      "Footprint qualification. " + framingNote,
    );
    expect(screen.getByTestId("framing-text-equivalent")).toHaveTextContent(
      framingNote,
    );
    expect(
      screen.getByRole("img", {
        name: /proportional framing simulator for andromeda galaxy/i,
      }),
    ).toHaveAccessibleDescription(new RegExp(framingNote));
  });

  it("announces a concise fit decision when the target changes", async () => {
    const user = userEvent.setup();
    renderLab();
    const liveStatus = screen.getByTestId("framing-live-status");
    const target = screen.getByRole("combobox", {
      name: "Astronomical target",
    });

    expect(liveStatus).toHaveTextContent(/andromeda galaxy.*extends beyond/i);
    await user.clear(target);
    await user.type(target, "Orion");
    await user.click(
      screen.getByRole("option", { name: "Orion Nebula · M42" }),
    );

    expect(screen.getByTestId("framing-live-status")).toBe(liveStatus);
    expect(liveStatus).toHaveTextContent(/orion nebula.*fits within/i);
  });

  it("rotates and reorients only the displayed sensor frame", async () => {
    const user = userEvent.setup();
    renderLab();
    const diagram = screen.getByRole("img", {
      name: /proportional framing simulator/i,
    });
    const primaryResult = screen.getByTestId("primary-result");
    const initialResult = primaryResult.textContent;
    const landscapeWidth = Number(diagram.dataset.fieldWidthDeg);
    const landscapeHeight = Number(diagram.dataset.fieldHeightDeg);

    await user.click(screen.getByRole("radio", { name: "Portrait" }));

    expect(diagram).toHaveAttribute("data-orientation", "portrait");
    expect(Number(diagram.dataset.fieldWidthDeg)).toBeCloseTo(
      landscapeHeight,
      12,
    );
    expect(Number(diagram.dataset.fieldHeightDeg)).toBeCloseTo(
      landscapeWidth,
      12,
    );

    fireEvent.change(screen.getByRole("slider", { name: "Frame rotation" }), {
      target: { value: "35" },
    });

    expect(screen.getByTestId("sensor-frame")).toHaveAttribute(
      "data-frame-rotation-deg",
      "35",
    );
    expect(primaryResult.textContent).toBe(initialResult);
  });

  it("uses one direction-neutral announcement for a half-turn", () => {
    renderLab();
    const rotation = screen.getByRole("slider", { name: "Frame rotation" });

    fireEvent.change(rotation, { target: { value: "180" } });

    expect(rotation).toHaveAttribute("aria-valuetext", "180 degrees");
    expect(screen.getByTestId("framing-text-equivalent")).toHaveTextContent(
      /frame rotated 180 degrees\./i,
    );
    expect(screen.getByTestId("framing-text-equivalent")).not.toHaveTextContent(
      /180 degrees (?:clockwise|counter-clockwise)/i,
    );
  });

  it("anchors the scale label to its SVG bar in wide and portrait views", async () => {
    const user = userEvent.setup();
    renderLab();

    function expectScaleLabelAligned() {
      const line = screen.getByTestId("angular-scale-bar-line");
      const label = screen.getByTestId("angular-scale-bar-label");
      expect(Number(label.getAttribute("x"))).toBeCloseTo(
        Number(line.getAttribute("x1")),
        12,
      );
      expect(Number(label.getAttribute("y"))).toBeLessThan(
        Number(line.getAttribute("y1")),
      );
    }

    expectScaleLabelAligned();
    await user.click(screen.getByRole("radio", { name: "Portrait" }));
    expectScaleLabelAligned();
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
    expect(
      screen.queryByTestId("calculation-equations"),
    ).not.toBeInTheDocument();

    await user.type(focalLength, "1200");

    expect(focalLength).toHaveValue(1200);
    expect(primaryResult).toHaveTextContent("1.12° × 0.75°");
    expect(screen.getByTestId("calculation-equations")).toBeVisible();
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
      screen.getAllByText("Likely undersampled for the stated seeing"),
    ).toHaveLength(3);

    const seeing = screen.getByRole("slider", { name: "Seeing" });
    fireEvent.change(seeing, { target: { value: "5" } });

    expect(seeing).toHaveValue("5");
    expect(
      screen.getAllByText("Broadly appropriate for many conditions"),
    ).toHaveLength(3);

    const oneByOne = screen.getByRole("radio", { name: "1×" });
    oneByOne.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "2×" })).toBeChecked();
    expect(
      screen.getAllByText("Likely undersampled for the stated seeing"),
    ).toHaveLength(3);
  });

  it("keeps mobile reading order logical before CSS changes presentation", () => {
    renderLab();

    const controls = screen.getByRole("heading", {
      name: "Configure the optical path",
    }).parentElement?.parentElement;
    const primaryResult = screen.getByTestId("primary-result");
    const visual = screen.getByRole("heading", {
      name: "Target framing simulator",
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
