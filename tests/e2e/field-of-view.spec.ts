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
  // Firefox can report a 44 CSS-pixel box a few ten-thousandths below 44
  // after device-pixel rounding. Reading the live DOM rectangle atomically
  // also avoids retaining an element handle across client hydration.
  await expect
    .poll(async () =>
      locator.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThanOrEqual(43.99);
  await expect
    .poll(async () =>
      locator.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(43.99);
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

  await page.getByRole("slider", { name: "Display zoom" }).fill("2");
  await page.getByRole("slider", { name: "Frame rotation" }).fill("35");
  await page.getByRole("radio", { name: "Portrait" }).check();
  await expectNoSeriousAccessibilityFindings(page);

  await page.getByRole("radio", { name: "Inches (in)" }).check();
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
  for (let index = 0; index < 100; index += 1) {
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
    "display-zoom",
    "frame-rotation",
  ];
  let previousIndex = -1;
  for (const id of expectedOrder) {
    const encounteredIndex = encounteredIds.indexOf(id);
    expect(
      encounteredIndex,
      "Expected keyboard focus to reach " +
        id +
        " after the prior milestone. Encountered: " +
        encounteredIds.join(", "),
    ).toBeGreaterThan(previousIndex);
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

  const primaryResult = page.getByTestId("primary-result");
  const diagram = page.getByRole("img", {
    name: /proportional framing simulator/i,
  });
  const opticalResult = await primaryResult.textContent();
  const landscapeWidth = await diagram.getAttribute("data-field-width-deg");
  const landscapeHeight = await diagram.getAttribute("data-field-height-deg");
  const displayZoom = page.getByRole("slider", { name: "Display zoom" });
  await displayZoom.focus();
  await page.keyboard.press("ArrowRight");
  await expect(displayZoom).toHaveValue("1.25");
  await expect(diagram).toHaveAttribute("data-display-zoom", "1.25");

  const frameRotation = page.getByRole("slider", { name: "Frame rotation" });
  await frameRotation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(frameRotation).toHaveValue("1");
  await expect(page.getByTestId("sensor-frame")).toHaveAttribute(
    "data-frame-rotation-deg",
    "1",
  );

  const landscape = page.getByRole("radio", { name: "Landscape" });
  await landscape.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Portrait" })).toBeChecked();
  await expect(diagram).toHaveAttribute(
    "data-field-width-deg",
    landscapeHeight ?? "",
  );
  await expect(diagram).toHaveAttribute(
    "data-field-height-deg",
    landscapeWidth ?? "",
  );
  await expect(primaryResult).toHaveText(opticalResult ?? "");
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
  await expect(
    page.getByRole("img", {
      name: /proportional framing simulator for orion nebula/i,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("target-footprint")).toBeVisible();

  await page
    .getByRole("spinbutton", { name: "Native focal length" })
    .fill("2000");
  await page.getByRole("radio", { name: "2×" }).check();
  await page.getByRole("slider", { name: "Seeing" }).fill("2.5");
  await expect(page.getByText("1400.00 mm focal length")).toBeVisible();
  expect(networkCalls).toEqual([]);
});

test("display zoom changes only the deterministic view geometry", async ({
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

  const primaryResult = page.getByTestId("primary-result");
  const diagram = page.getByRole("img", {
    name: /proportional framing simulator/i,
  });
  const target = page.getByTestId("target-footprint");
  const frame = page.getByTestId("sensor-frame");
  const fit = page.getByTestId("framing-fit-status");
  const resultBefore = await primaryResult.textContent();
  const fitBefore = await fit.textContent();
  const viewBoxBefore = await diagram.getAttribute("viewBox");
  const targetBefore = await target.boundingBox();
  const frameBefore = await frame.boundingBox();

  await page.getByRole("slider", { name: "Display zoom" }).fill("2");

  await expect(diagram).toHaveAttribute("data-display-zoom", "2");
  expect(await diagram.getAttribute("viewBox")).not.toBe(viewBoxBefore);
  await expect(primaryResult).toHaveText(resultBefore ?? "");
  await expect(fit).toHaveText(fitBefore ?? "");
  const targetAfter = await target.boundingBox();
  const frameAfter = await frame.boundingBox();

  expect(targetBefore).not.toBeNull();
  expect(frameBefore).not.toBeNull();
  expect(targetAfter).not.toBeNull();
  expect(frameAfter).not.toBeNull();
  // Vector-effect keeps outlines legible at a fixed pixel width, so rendered
  // bounding boxes can differ slightly even though the tested angular data
  // attributes and pure-model ratio are exact.
  expect((targetAfter?.width ?? 0) / (frameAfter?.width ?? 1)).toBeCloseTo(
    (targetBefore?.width ?? 0) / (frameBefore?.width ?? 1),
    1,
  );
  expect(targetAfter?.width ?? 0).toBeGreaterThan(
    (targetBefore?.width ?? 0) * 1.9,
  );
  expect(networkCalls).toEqual([]);
});

test("frame rotation and sensor orientation stay independent from calculations", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  const primaryResult = page.getByTestId("primary-result");
  const diagram = page.getByRole("img", {
    name: /proportional framing simulator/i,
  });
  const originalResult = await primaryResult.textContent();
  const landscapeWidth = Number(
    await diagram.getAttribute("data-field-width-deg"),
  );
  const landscapeHeight = Number(
    await diagram.getAttribute("data-field-height-deg"),
  );
  const scaleLine = page.getByTestId("angular-scale-bar-line");
  const scaleLabel = page.getByTestId("angular-scale-bar-label");
  const orientationMark = page.getByTestId("framing-orientation-mark");
  const gridLabel = page.getByTestId("framing-grid-label");

  async function expectScaleLabelAligned() {
    expect(Number(await scaleLabel.getAttribute("x"))).toBeCloseTo(
      Number(await scaleLine.getAttribute("x1")),
      10,
    );
    expect(Number(await scaleLabel.getAttribute("y"))).toBeLessThan(
      Number(await scaleLine.getAttribute("y1")),
    );
  }

  await expectScaleLabelAligned();
  const scaleLabelStyle = await scaleLabel.evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const strokeWidth = Number.parseFloat(style.strokeWidth);
    return {
      strokeToFontRatio: style.strokeWidth.endsWith("em")
        ? strokeWidth
        : strokeWidth / fontSize,
      strokeWidth,
    };
  });
  expect(scaleLabelStyle.strokeWidth).toBeGreaterThan(0);
  expect(scaleLabelStyle.strokeToFontRatio).toBeLessThan(0.5);

  const orientationBox = await orientationMark.boundingBox();
  const gridBox = await gridLabel.boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(orientationBox).not.toBeNull();
  if (viewportWidth > 600) {
    expect(gridBox).not.toBeNull();
    expect(
      (orientationBox?.x ?? 0) + (orientationBox?.width ?? 0),
    ).toBeLessThan(gridBox?.x ?? 0);
  } else {
    expect(gridBox).toBeNull();
  }

  await page.getByRole("radio", { name: "Portrait" }).check();
  await page.getByRole("slider", { name: "Frame rotation" }).fill("35");

  await expect(diagram).toHaveAttribute("data-orientation", "portrait");
  expect(
    Number(await diagram.getAttribute("data-field-width-deg")),
  ).toBeCloseTo(landscapeHeight, 10);
  expect(
    Number(await diagram.getAttribute("data-field-height-deg")),
  ).toBeCloseTo(landscapeWidth, 10);
  await expect(page.getByTestId("sensor-frame")).toHaveAttribute(
    "data-frame-rotation-deg",
    "35",
  );
  await expect(primaryResult).toHaveText(originalResult ?? "");
  await expect(page.getByTestId("framing-text-equivalent")).toContainText(
    "portrait, frame rotated 35 degrees clockwise",
  );
  await expectScaleLabelAligned();
});

test("semantic equations and physical-unit displays preserve every optical result", async ({
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

  const panel = page.getByTestId("calculation-equations");
  await expect(
    panel.getByRole("heading", { name: "Equations and interpretation" }),
  ).toBeVisible();
  for (const title of [
    "Effective optics",
    "Sensor geometry",
    "Exact field of view",
    "Image scale",
    "Seeing and sampling",
  ]) {
    await expect(
      panel.getByRole("heading", { level: 3, name: title }),
    ).toBeVisible();
  }

  const math = page.getByRole("math");
  await expect(math).toHaveCount(18);
  for (let index = 0; index < (await math.count()); index += 1) {
    await expect(math.nth(index)).toHaveAttribute("display", "block");
    await expect(math.nth(index)).not.toHaveAttribute("aria-label");
    await expect(math.nth(index)).not.toHaveAttribute("aria-labelledby");
  }
  await expect(panel.locator("mfrac").first()).toBeAttached();
  await expect(panel.locator("msqrt").first()).toBeAttached();
  await expect(panel.locator("mtable").first()).toBeAttached();
  await expect(panel).toContainText("arctan");
  await expect(panel).not.toContainText("tan⁻¹");

  const primary = page.getByTestId("primary-result");
  const imageScaleResult = page
    .locator("dt", { hasText: /^Image scale$/ })
    .locator("..");
  const samplingResult = page
    .locator("dt", { hasText: /^Sampling$/ })
    .locator("..");
  const diagram = page.getByRole("img", {
    name: /proportional framing simulator/i,
  });
  const before = {
    primary: await primary.textContent(),
    imageScale: await imageScaleResult.textContent(),
    sampling: await samplingResult.textContent(),
    fieldWidth: await diagram.getAttribute("data-field-width-deg"),
    fieldHeight: await diagram.getAttribute("data-field-height-deg"),
  };

  await page.getByRole("radio", { name: "Inches (in)" }).check();

  await expect(primary).toHaveText(before.primary ?? "");
  await expect(imageScaleResult).toHaveText(before.imageScale ?? "");
  await expect(samplingResult).toHaveText(before.sampling ?? "");
  await expect(diagram).toHaveAttribute(
    "data-field-width-deg",
    before.fieldWidth ?? "",
  );
  await expect(diagram).toHaveAttribute(
    "data-field-height-deg",
    before.fieldHeight ?? "",
  );
  await expect(
    page.locator("dt", { hasText: /^Sensor size$/ }).locator(".."),
  ).toContainText("0.925 × 0.618 in");
  await expect(
    page.locator("dt", { hasText: /^Effective optics$/ }).locator(".."),
  ).toContainText("23.622 in focal length");
  await expect(panel).toContainText("25.4");
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toHaveValue("600");
  await expect(page.getByRole("spinbutton", { name: "Aperture" })).toHaveValue(
    "80",
  );
  await expect(page.getByTestId("telescope-status")).not.toContainText(
    "Customised",
  );

  await page
    .getByRole("group", { name: "Sensor size source" })
    .getByRole("radio", { name: "Pixel resolution" })
    .check();
  await expect(
    page.getByText("Sensor width and height — symbolic"),
  ).toBeVisible();
  await expect(panel).toContainText("25400");

  await page
    .getByRole("group", { name: "Focal length input" })
    .getByRole("radio", { name: "Derive from focal ratio" })
    .check();
  await expect(
    page.getByText("Derived native focal length — symbolic"),
  ).toBeVisible();
  expect(networkCalls).toEqual([]);
});

test("every initial target has a recognisable local illustration and source disclosure", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");

  const targets = [
    { query: "Moon", option: "Moon", name: /for moon/i, asset: "moon.svg" },
    { query: "Sun", option: "Sun", name: /for sun/i, asset: "sun.svg" },
    {
      query: "Andromeda",
      option: "Andromeda Galaxy · M31",
      name: /for andromeda galaxy/i,
      asset: "andromeda-galaxy.svg",
    },
    {
      query: "Orion",
      option: "Orion Nebula · M42",
      name: /for orion nebula/i,
      asset: "orion-nebula.svg",
    },
    {
      query: "Pleiades",
      option: "Pleiades · M45",
      name: /for pleiades/i,
      asset: "pleiades.svg",
    },
    {
      query: "Rosette",
      option: "Rosette Nebula · NGC 2237",
      name: /for rosette nebula/i,
      asset: "rosette-nebula.svg",
    },
  ] as const;

  for (const target of targets) {
    await chooseComboboxOption(
      page,
      "Astronomical target",
      target.query,
      target.option,
    );
    await expect(page.getByRole("img", { name: target.name })).toBeVisible();
    await expect(page.locator("svg image")).toHaveAttribute(
      "href",
      "/targets/" + target.asset,
    );
    await expect(
      page.getByRole("link", { name: "Asset licence" }),
    ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    await expect(
      page.getByRole("link", { name: "Angular-size source" }),
    ).toBeVisible();

    if (target.asset === "rosette-nebula.svg") {
      await expect(page.getByTestId("target-framing-note")).toContainText(
        "Planning proxy based on the cited 126 × 115 arcminute",
      );
      await expect(page.getByTestId("target-framing-note")).toContainText(
        "not a calibrated boundary of the nebula",
      );
    } else {
      await expect(page.getByTestId("target-framing-note")).toHaveCount(0);
    }
  }
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
  await expect(
    page.getByRole("combobox", { name: "Telescope preset" }),
  ).toHaveValue(/evostar/i);

  for (const control of [
    page.getByRole("combobox", { name: "Telescope preset" }),
    page.getByRole("spinbutton", { name: "Native focal length" }),
    page.getByRole("spinbutton", { name: "Aperture" }),
    page.getByRole("combobox", { name: "Modifier preset" }),
    page.getByRole("combobox", { name: "Camera preset" }),
    page.getByRole("slider", { name: "Seeing" }),
    page.getByRole("combobox", { name: "Astronomical target" }),
    page.getByRole("slider", { name: "Display zoom" }),
    page.getByRole("slider", { name: "Frame rotation" }),
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

  const displayUnit = page.getByRole("radio", { name: "Millimetres (mm)" });
  await displayUnit.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Inches (in)" })).toBeChecked();
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

  await expect(page.getByTestId("framing-orientation-mark")).toBeVisible();
  await expect(page.getByTestId("framing-grid-label")).toBeHidden();

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
  await expect(
    page.getByRole("heading", { name: "Equations and interpretation" }),
  ).toBeVisible();
  const equationViewports = page.locator(
    '[aria-label$="scroll horizontally if needed"]',
  );
  await expect(equationViewports).toHaveCount(18);
  for (let index = 0; index < (await equationViewports.count()); index += 1) {
    const metrics = await equationViewports.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        overflowX: style.overflowX,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(["auto", "scroll"]).toContain(metrics.overflowX);
    expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
  }
  const longEquation = page.getByRole("group", {
    name: "Horizontal, vertical, and diagonal fields — current values; scroll horizontally if needed",
  });
  const longEquationMetrics = await longEquation.evaluate((element) => {
    element.scrollLeft = 0;
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  expect(longEquationMetrics.scrollWidth).toBeGreaterThan(
    longEquationMetrics.clientWidth,
  );
  await longEquation.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => longEquation.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("slider", { name: "Display zoom" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /proportional framing simulator/i }),
  ).toBeVisible();
  await expect(page.getByText(/not a calibrated sky survey/i)).toBeVisible();
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
      const seconds = (durationList: string) => {
        if (!durationList.trim()) {
          return 0;
        }

        return Math.max(
          ...durationList.split(",").map((duration) => {
            const value = Number.parseFloat(duration);
            return duration.trim().endsWith("ms") ? value / 1_000 : value;
          }),
        );
      };

      return {
        animation: seconds(style.animationDuration),
        motionPreference: matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
        transition: seconds(style.transitionDuration),
      };
    });

  expect(durations.motionPreference).toBe(true);
  expect(durations.animation).toBeLessThanOrEqual(0.001);
  expect(durations.transition).toBeLessThanOrEqual(0.001);
});
