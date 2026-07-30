import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import { FieldOfViewPageView, loadInitialCatalogue } from "./page";

describe("field of view page", () => {
  it("uses page landmarks and introduces the calculator shell", () => {
    render(<FieldOfViewPageView catalogue={fieldOfViewCatalogueFixture} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Frame the sky with confidence.",
      }),
    ).toBeInTheDocument();
  });

  it("converts a rejected cached read into the explicit manual fallback", async () => {
    const catalogue = await loadInitialCatalogue(async () => {
      throw new Error("database unavailable");
    });

    expect(catalogue).toEqual({
      status: "unavailable",
      telescopes: [],
      cameras: [],
      opticalModifiers: [],
      targets: [],
    });
  });

  it("preserves a successful cached catalogue", async () => {
    await expect(
      loadInitialCatalogue(async () => fieldOfViewCatalogueFixture),
    ).resolves.toBe(fieldOfViewCatalogueFixture);
  });
});
