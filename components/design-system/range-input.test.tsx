import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RangeInput } from "./range-input";

afterEach(cleanup);

describe("RangeInput", () => {
  it("exposes its label, description, error, and formatted value text", () => {
    render(
      <RangeInput
        description="Estimated stellar FWHM at the observing site."
        error="Seeing must be between 1 and 5 arcseconds."
        id="seeing"
        label="Seeing"
        max={5}
        min={1}
        name="seeing"
        onValueChange={vi.fn()}
        step={0.1}
        value={2}
        valueText="2.0 arcseconds"
      />,
    );

    const slider = screen.getByRole("slider", { name: "Seeing" });

    expect(slider).toHaveAttribute("aria-valuetext", "2.0 arcseconds");
    expect(slider).toHaveAttribute("aria-invalid", "true");
    expect(slider).toHaveAttribute(
      "aria-describedby",
      "seeing-description seeing-error",
    );
    expect(
      screen.getByText("Estimated stellar FWHM at the observing site."),
    ).toBeVisible();
    expect(
      screen.getByText("Seeing must be between 1 and 5 arcseconds."),
    ).toBeVisible();
    expect(screen.getByText("2.0 arcseconds")).toBeVisible();
  });

  it("emits numeric changes and updates its visible and accessible value", () => {
    const onValueChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState(2);

      return (
        <RangeInput
          label="Seeing"
          max={5}
          min={1}
          name="seeing"
          onValueChange={(nextValue) => {
            onValueChange(nextValue);
            setValue(nextValue);
          }}
          step={0.1}
          value={value}
          valueText={`${value.toFixed(1)} arcseconds`}
        />
      );
    }

    render(<Harness />);
    const slider = screen.getByRole("slider", {
      name: "Seeing",
    }) as HTMLInputElement;

    fireEvent.change(slider, { target: { value: "2.5" } });

    expect(onValueChange).toHaveBeenLastCalledWith(2.5);
    expect(slider.value).toBe("2.5");
    expect(slider).toHaveAttribute("aria-valuetext", "2.5 arcseconds");
    expect(screen.getByText("2.5 arcseconds")).toBeVisible();
  });
});
