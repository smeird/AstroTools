import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NumericInput } from "./numeric-input";

afterEach(cleanup);

describe("NumericInput", () => {
  it("associates its visible label, description, and error with the input", () => {
    render(
      <NumericInput
        description="The principal field-of-view input."
        error="Enter a focal length from 10 to 20,000 mm."
        id="native-focal-length"
        label="Native focal length"
        max={20_000}
        min={10}
        name="native-focal-length"
        onValueChange={vi.fn()}
        required
        step="any"
        unit="mm"
        unitLabel="millimetres"
        value=""
      />,
    );

    const input = screen.getByRole("spinbutton", {
      name: "Native focal length",
    });

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "native-focal-length-unit native-focal-length-description native-focal-length-error",
    );
    expect(input).toHaveAccessibleDescription(
      /unit: millimetres.*principal field-of-view input.*10 to 20,000 mm/i,
    );
    expect(
      screen.getByText("The principal field-of-view input."),
    ).toBeVisible();
    expect(
      screen.getByText("Enter a focal length from 10 to 20,000 mm."),
    ).toBeVisible();
    expect(screen.getAllByText("mm").length).toBeGreaterThan(0);
  });

  it("preserves raw empty and decimal edits for boundary validation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState("600");

      return (
        <NumericInput
          label="Native focal length"
          name="native-focal-length"
          onValueChange={(nextValue) => {
            onValueChange(nextValue);
            setValue(nextValue);
          }}
          value={value}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByRole("spinbutton", {
      name: "Native focal length",
    }) as HTMLInputElement;

    await user.clear(input);
    expect(input.value).toBe("");
    expect(onValueChange).toHaveBeenLastCalledWith("");

    await user.type(input, "3.76");
    expect(input.value).toBe("3.76");
    expect(onValueChange).toHaveBeenLastCalledWith("3.76");
  });
});
