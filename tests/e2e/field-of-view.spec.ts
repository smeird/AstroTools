import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

async function expectNoSeriousAccessibilityFindings(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const releaseBlockingViolations = scan.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );

  expect(releaseBlockingViolations).toEqual([]);
}

async function expectMinimumTarget(locator: Locator) {
  const box = await locator.boundingBox();

  // Firefox can report a 44 CSS-pixel box a few ten-thousandths below 44
  // after device-pixel rounding. Keep the tolerance far below one CSS pixel.
  expect(box?.width).toBeGreaterThanOrEqual(43.99);
  expect(box?.height).toBeGreaterThanOrEqual(43.99);
}

async function chooseComboboxOption(
  page: Page,
  label: string,
  query: string,
  optionName: string | RegExp,
) {
  const combobox = page.getByRole("combobox", { name: label });
  await combobox.fill(query);
  await page.getByRole("option", { name: optionName }).click();
}

test("the configured calculator has no serious or critical accessibility findings", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  await expect(
    page.getByRole("combobox", { name: "Telescope preset" }),
  ).toHaveValue(/evostar/i);
  await expectNoSeriousAccessibilityFindings(page);

  await page.getByRole("combobox", { name: "Telescope preset" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expectNoSeriousAccessibilityFindings(page);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add manual modifier" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Magnification factor" }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityFindings(page);

  await page.getByRole("spinbutton", { name: "Native focal length" }).fill("");
  await expect(page.getByText(/enter a focal length from/i)).toBeVisible();
  await expectNoSeriousAccessibilityFindings(page);
});

test("the complete configuration reading order is reachable by keyboard", async ({
  browserName,
  page,
}) => {
  const focusNext = browserName === "webkit" ? "Alt+Tab" : "Tab";

  await page.goto("/calculators/field-of-view");
  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const encounteredIds: string[] = [];
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press(focusNext);
    const activeId = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.id ?? "",
    );
    if (activeId) {
      encounteredIds.push(activeId);
    }
  }

  const expectedOrder = [
    "telescope-preset",
    "focal-length",
    "aperture",
    "focal-ratio",
    "modifier-preset",
    "camera-preset",
    "sensor-width",
    "sensor-height",
    "pixel-size",
    "seeing",
    "target-preset",
  ];
  let previousIndex = -1;
  for (const id of expectedOrder) {
    const encounteredIndex = encounteredIds.indexOf(id);
    expect(encounteredIndex).toBeGreaterThan(previousIndex);
    previousIndex = encounteredIndex;
  }

  const telescope = page.getByRole("combobox", {
    name: "Telescope preset",
  });
  await telescope.focus();
  await telescope.press("ControlOrMeta+A");
  await telescope.pressSequentially("Celestron");
  await telescope.press("ArrowDown");
  await telescope.press("Enter");
  await expect(telescope).toHaveValue(/celestron edgehd/i);

  const binning = page.getByRole("radio", { name: "1×" });
  await binning.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "2×" })).toBeChecked();
});

test("catalogue presets and an optical reducer update the imaging result locally", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  await page.waitForLoadState("networkidle");
  const networkCalls: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) {
      networkCalls.push(request.url());
    }
  });

  await chooseComboboxOption(
    page,
    "Telescope preset",
    "Celestron EdgeHD",
    /celestron edgehd 8-inch/i,
  );
  await chooseComboboxOption(
    page,
    "Modifier preset",
    "Celestron reducer",
    /celestron reducer lens 0\.7x/i,
  );
  await page.getByRole("button", { name: "Add selected modifier" }).click();
  await chooseComboboxOption(
    page,
    "Camera preset",
    "ASI533",
    "ZWO ASI533MC Pro",
  );
  await chooseComboboxOption(
    page,
    "Astronomical target",
    "Orion",
    "Orion Nebula · M42",
  );

  await expect(page.getByText("1422.40 mm focal length")).toBeVisible();
  await expect(page.getByTestId("primary-result")).toContainText(
    "0.46° × 0.46°",
  );
  await expect(page.getByText(/orion nebula is selected/i)).toBeVisible();

  await page
    .getByRole("spinbutton", { name: "Native focal length" })
    .fill("2000");
  await page.getByRole("radio", { name: "2×" }).check();
  await page.getByRole("slider", { name: "Seeing" }).fill("2.5");
  await expect(page.getByText("1400.00 mm focal length")).toBeVisible();
  expect(networkCalls).toEqual([]);
});

test("manual edits are preserved and reset to the latest selected presets", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  await chooseComboboxOption(
    page,
    "Telescope preset",
    "Celestron",
    /celestron edgehd 8-inch/i,
  );
  const focalLength = page.getByRole("spinbutton", {
    name: "Native focal length",
  });

  await focalLength.fill("1800");
  await expect(page.getByTestId("telescope-status")).toContainText(
    "Customised preset",
  );
  await page
    .getByRole("group", { name: "Telescope source" })
    .getByRole("radio", { name: "Manual" })
    .click();
  await expect(focalLength).toHaveValue("1800");
  await expect(
    page.getByRole("combobox", { name: "Telescope preset" }),
  ).toBeDisabled();

  await page
    .getByRole("button", {
      name: /restore celestron edgehd 8-inch optical tube assembly preset/i,
    })
    .click();
  await expect(focalLength).toHaveValue("2032");

  await chooseComboboxOption(
    page,
    "Camera preset",
    "ASI533",
    "ZWO ASI533MC Pro",
  );
  const sensorWidth = page.getByRole("spinbutton", { name: "Sensor width" });
  await sensorWidth.fill("12");
  await page
    .getByRole("group", { name: "Camera source" })
    .getByRole("radio", { name: "Manual" })
    .click();
  await expect(sensorWidth).toHaveValue("12");
  await page
    .getByRole("button", { name: "Restore ZWO ASI533MC Pro preset" })
    .click();
  await expect(sensorWidth).toHaveValue("11.31");
});

test("aperture changes field only after derived focal length is selected", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  const primaryResult = page.getByTestId("primary-result");
  const aperture = page.getByRole("spinbutton", { name: "Aperture" });
  const focalLength = page.getByRole("spinbutton", {
    name: "Native focal length",
  });
  const initialField = await primaryResult.textContent();

  await aperture.fill("100");
  await expect(primaryResult).toHaveText(initialField ?? "");
  await page
    .getByRole("group", { name: "Focal length input" })
    .getByRole("radio", { name: "Derive from focal ratio" })
    .click();
  await expect(focalLength).toHaveAttribute("readonly");

  await aperture.fill("120");
  await expect(focalLength).toHaveValue("720");
  await expect(primaryResult).not.toHaveText(initialField ?? "");
});

test("controls meet minimum pointer targets and expose visible focus", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");

  for (const control of [
    page.getByRole("combobox", { name: "Telescope preset" }),
    page.getByRole("spinbutton", { name: "Native focal length" }),
    page.getByRole("spinbutton", { name: "Aperture" }),
    page.getByRole("combobox", { name: "Modifier preset" }),
    page.getByRole("combobox", { name: "Camera preset" }),
    page.getByRole("slider", { name: "Seeing" }),
    page.getByRole("combobox", { name: "Astronomical target" }),
    page.getByRole("button", { name: "Add manual modifier" }),
  ]) {
    await expectMinimumTarget(control);
  }

  for (const radio of await page.getByRole("radio").all()) {
    const label = radio.locator("xpath=ancestor::label");
    await expectMinimumTarget(label);
  }

  const focalLength = page.getByRole("spinbutton", {
    name: "Native focal length",
  });
  await focalLength.focus();
  const focusStyle = await focalLength.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.style).not.toBe("none");
  expect(focusStyle.width).toBeGreaterThanOrEqual(3);
});

test("modifier removal and clearing return keyboard focus to a stable control", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  const addManual = page.getByRole("button", { name: "Add manual modifier" });

  await addManual.click();
  const remove = page.getByRole("button", {
    name: "Remove Manual optical modifier",
  });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(addManual).toBeFocused();

  await addManual.click();
  await addManual.click();
  const clear = page.getByRole("button", { name: "Clear modifier chain" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(addManual).toBeFocused();
});

test("the shell avoids page overflow at 320 CSS pixels and 200% content zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/calculators/field-of-view");

  const beforeZoom = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(beforeZoom).toBe(true);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const afterZoom = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(afterZoom).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Imaging results" }),
  ).toBeVisible();
});

test("reduced-motion preference suppresses non-essential motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/calculators/field-of-view");

  const durations = await page
    .getByRole("combobox", { name: "Telescope preset" })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animation: Number.parseFloat(style.animationDuration),
        transition: Number.parseFloat(style.transitionDuration),
      };
    });

  expect(durations.animation).toBeLessThanOrEqual(0.001);
  expect(durations.transition).toBeLessThanOrEqual(0.001);
});
