import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "./combobox";
import type { ComboboxOption } from "./combobox";

afterEach(cleanup);

const OPTIONS: readonly ComboboxOption[] = [
  {
    value: "evostar",
    label: "Sky-Watcher EVOSTAR 80EDX",
    searchText: "refractor 600mm",
  },
  {
    value: "legacy-camera",
    label: "Legacy camera",
    searchText: "inactive",
    disabled: true,
  },
  {
    value: "asi2600",
    label: "ZWO ASI2600MC Pro",
    searchText: "camera aps-c",
  },
  {
    value: "edgehd",
    label: "Celestron EdgeHD 8",
    searchText: "reflector 2032mm",
  },
];

interface HarnessProps {
  initialQuery?: string;
  initialSelectedValue?: string | null;
  onSelectionChange: (value: string | null) => void;
  options?: readonly ComboboxOption[];
}

function Harness({
  initialQuery = "",
  initialSelectedValue = null,
  onSelectionChange,
  options = OPTIONS,
}: HarnessProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedValue, setSelectedValue] = useState<string | null>(
    initialSelectedValue,
  );

  return (
    <Combobox
      description="Type a manufacturer or model, then choose an option."
      error={selectedValue ? undefined : "Choose a reference option."}
      id="equipment"
      label="Equipment"
      name="equipment"
      onQueryChange={setQuery}
      onSelectionChange={(nextValue) => {
        onSelectionChange(nextValue);
        setSelectedValue(nextValue);
      }}
      options={options}
      query={query}
      required
      selectedValue={selectedValue}
    />
  );
}

describe("Combobox", () => {
  it("associates its visible label, description, and error with the text input", () => {
    render(<Harness onSelectionChange={vi.fn()} />);

    const input = screen.getByRole("combobox", { name: "Equipment" });

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "equipment-description equipment-error",
    );
    expect(
      screen.getByText("Type a manufacturer or model, then choose an option."),
    ).toBeVisible();
    expect(screen.getByText("Choose a reference option.")).toBeVisible();
  });

  it("filters options by label and supplemental search text", async () => {
    const user = userEvent.setup();
    render(<Harness onSelectionChange={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    await user.type(input, "aps-c");

    expect(
      screen.getByRole("option", { name: "ZWO ASI2600MC Pro" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Sky-Watcher EVOSTAR 80EDX" }),
    ).not.toBeInTheDocument();
  });

  it("skips disabled options and commits the active option with Enter", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Harness onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    expect(screen.getByText("›")).toHaveAttribute("aria-hidden", "true");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      "equipment-option-evostar",
    );

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      "equipment-option-asi2600",
    );

    await user.keyboard("{Enter}");

    expect(onSelectionChange).toHaveBeenLastCalledWith("asi2600");
    expect(input).toHaveValue("ZWO ASI2600MC Pro");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape without changing the committed selection", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Harness
        initialQuery="Sky-Watcher EVOSTAR 80EDX"
        initialSelectedValue="evostar"
        onSelectionChange={onSelectionChange}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.clear(input);
    await user.type(input, "ZWO");
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);

    await user.keyboard("{Escape}");

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Sky-Watcher EVOSTAR 80EDX");
    expect(onSelectionChange).toHaveBeenLastCalledWith("evostar");
  });

  it("supports pointer selection but does not select a disabled option", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Harness onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    const disabledOption = screen.getByRole("option", {
      name: "Legacy camera",
    });
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");

    await user.click(disabledOption);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.click(
      screen.getByRole("option", { name: "Celestron EdgeHD 8" }),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith("edgehd");
    expect(input).toHaveValue("Celestron EdgeHD 8");
  });

  it("shows a non-option message when filtering has no results", async () => {
    const user = userEvent.setup();
    render(<Harness onSelectionChange={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    await user.type(input, "not-in-the-catalogue");

    expect(screen.getByRole("listbox")).toBeVisible();
    expect(screen.getByText("No matching options")).toBeVisible();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("lets native Tab navigation leave an open final combobox", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness onSelectionChange={vi.fn()} />
        <button type="button">Next control</button>
      </>,
    );
    const input = screen.getByRole("combobox", { name: "Equipment" });

    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toHaveAttribute("tabindex", "-1");
    await user.tab();

    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the active descendant visible while navigating a long list", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const longOptions = Array.from({ length: 12 }, (_, index) => ({
      value: `option-${index + 1}`,
      label: `Equipment option ${index + 1}`,
    }));

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(<Harness onSelectionChange={vi.fn()} options={longOptions} />);
      const input = screen.getByRole("combobox", { name: "Equipment" });

      await user.click(input);
      scrollIntoView.mockClear();
      await user.keyboard(
        "{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}",
      );

      expect(input).toHaveAttribute(
        "aria-activedescendant",
        "equipment-option-option-8",
      );
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });
      expect(scrollIntoView.mock.instances.at(-1)).toHaveTextContent(
        "Equipment option 8",
      );
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(Element.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    }
  });
});
