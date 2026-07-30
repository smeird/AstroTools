import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fieldOfViewCatalogueFixture } from "@/tests/fixtures/field-of-view-catalogue";
import { COMPLEX_FIELD_OF_VIEW_SHARE_V1 } from "@/tests/fixtures/field-of-view-shareable-state-v1";
import { parseFieldOfViewShareState } from "@/features/field-of-view/schemas/shareable-state";
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

  it("renders shared state and a non-disruptive safe-default notice", () => {
    const shared = parseFieldOfViewShareState(
      new URLSearchParams(
        COMPLEX_FIELD_OF_VIEW_SHARE_V1.replace("zoom=2.5", "zoom=999"),
      ),
      fieldOfViewCatalogueFixture,
    );

    render(
      <FieldOfViewPageView
        catalogue={fieldOfViewCatalogueFixture}
        initialConfiguration={shared.state}
        shareNotice={shared.notice}
      />,
    );

    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveValue(1800);
    expect(screen.getByRole("note")).toHaveTextContent(
      /safe defaults were restored for: display zoom/i,
    );
    expect(screen.getByRole("note")).not.toHaveAttribute("aria-live");
    expect(screen.getByRole("note")).not.toHaveTextContent("999");
  });

  it("renders unsupported versions as a default configuration", () => {
    const shared = parseFieldOfViewShareState(
      new URLSearchParams("v=999&f=1200"),
      fieldOfViewCatalogueFixture,
    );

    render(
      <FieldOfViewPageView
        catalogue={fieldOfViewCatalogueFixture}
        initialConfiguration={shared.state}
        shareNotice={shared.notice}
      />,
    );

    expect(
      screen.getByRole("spinbutton", { name: "Native focal length" }),
    ).toHaveValue(600);
    expect(screen.getByRole("note")).toHaveTextContent(
      /unsupported version.*default configuration was restored safely/i,
    );
  });
});
