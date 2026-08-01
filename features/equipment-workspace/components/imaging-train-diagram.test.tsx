import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEquipmentConfiguration } from "@/features/field-of-view/model/equipment-configuration";
import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";

import {
  classifyOpticalDesign,
  ImagingTrainDiagram,
} from "./imaging-train-diagram";

describe("imaging train diagram", () => {
  it("classifies catalogue optical designs without focal-ratio guessing", () => {
    expect(classifyOpticalDesign("ED doublet apochromatic refractor")).toBe(
      "refractor",
    );
    expect(classifyOpticalDesign("EdgeHD Schmidt-Cassegrain")).toBe(
      "catadioptric",
    );
    expect(classifyOpticalDesign("Newtonian reflector")).toBe("reflector");
    expect(classifyOpticalDesign(null)).toBe("generic");
  });

  it("shows every valid selected and derived rig fact", () => {
    render(
      <ImagingTrainDiagram
        state={createEquipmentConfiguration(fieldOfViewCatalogueFixture)}
      />,
    );

    expect(screen.getByRole("img")).toHaveAccessibleName(
      /ED doublet apochromatic refractor/,
    );
    expect(screen.getByText("Clear aperture")).toBeInTheDocument();
    expect(screen.getAllByText("Ø 80.0 mm")).toHaveLength(2);
    expect(screen.getByText("Effective focal length")).toBeInTheDocument();
    expect(screen.getByText("Sensor")).toBeInTheDocument();
    expect(screen.getByText("Image scale")).toBeInTheDocument();
  });
});
