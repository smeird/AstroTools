import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

afterEach(cleanup);

const UNIT_OPTIONS = [
  { value: "millimetres", label: "mm" },
  { value: "inches", label: "in" },
] as const;

type UnitValue = (typeof UNIT_OPTIONS)[number]["value"];

describe("SegmentedControl", () => {
  it("uses a native labelled radio group with associated help and error text", () => {
    render(
      <SegmentedControl<UnitValue>
        description="Changes display units only."
        error="Choose a display unit."
        id="display-units"
        label="Display units"
        name="display-units"
        onValueChange={vi.fn()}
        options={UNIT_OPTIONS}
        required
        value="millimetres"
      />,
    );

    const group = screen.getByRole("group", { name: "Display units" });
    const millimetres = screen.getByRole("radio", { name: "mm" });
    const inches = screen.getByRole("radio", { name: "in" });

    expect(group).toHaveAttribute(
      "aria-describedby",
      "display-units-description display-units-error",
    );
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(millimetres).toBeChecked();
    expect(screen.getByText("✓")).toHaveAttribute("aria-hidden", "true");
    expect(millimetres).toBeRequired();
    expect(inches).not.toBeChecked();
    expect(screen.getByText("Changes display units only.")).toBeVisible();
    expect(screen.getByText("Choose a display unit.")).toBeVisible();
  });

  it("changes the checked native radio with arrow-key navigation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState<UnitValue>("millimetres");

      return (
        <SegmentedControl<UnitValue>
          label="Display units"
          name="display-units"
          onValueChange={(nextValue) => {
            onValueChange(nextValue);
            setValue(nextValue);
          }}
          options={UNIT_OPTIONS}
          value={value}
        />
      );
    }

    render(<Harness />);
    const millimetres = screen.getByRole("radio", { name: "mm" });
    const inches = screen.getByRole("radio", { name: "in" });

    await user.tab();
    expect(millimetres).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(inches).toHaveFocus();
    expect(inches).toBeChecked();
    expect(millimetres).not.toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith("inches");
  });
});
