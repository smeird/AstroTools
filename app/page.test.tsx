import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("home page", () => {
  it("introduces the complete equipment-first planning suite", () => {
    render(<HomePage />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /know your rig before you lose the night/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /build or open my rig/i }),
    ).toHaveAttribute("href", "/equipment");
    expect(
      screen.getByRole("link", { name: /open the calculation dossier/i }),
    ).toHaveAttribute("href", "/calculations");
    for (const [name, href] of [
      [/^field of view/i, "/calculators/field-of-view"],
      [/^guiding ratio/i, "/calculators/guiding-ratio"],
      [/^polar alignment/i, "/calculators/polar-alignment-drift"],
      [/^exposure & snr/i, "/calculators/exposure-snr"],
      [/^mosaic planning/i, "/calculators/mosaic-planning"],
      [/^dew & heater/i, "/calculators/dew-heater"],
      [/^storage/i, "/calculators/storage-volume"],
      [/^optimal sub-exposure/i, "/calculators/optimal-sub-exposure"],
      [/^autofocus planning/i, "/calculators/autofocus-planning"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
  });
});
