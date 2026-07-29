import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FieldOfViewPage from "./page";

describe("field of view page", () => {
  it("uses page landmarks and introduces the calculator shell", () => {
    render(<FieldOfViewPage />);

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
});
