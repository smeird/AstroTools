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

  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

test("the calculator shell has no serious or critical accessibility findings", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");
  await expectNoSeriousAccessibilityFindings(page);

  await page.getByRole("combobox", { name: "Reference sensor" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expectNoSeriousAccessibilityFindings(page);

  await page.keyboard.press("Escape");
  await page.getByRole("spinbutton", { name: "Native focal length" }).fill("");
  await expect(page.getByText(/enter a focal length from/i)).toBeVisible();
  await expectNoSeriousAccessibilityFindings(page);
});

test("the complete reference setup is operable by keyboard", async ({
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

  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("link", { name: "All calculators" }),
  ).toBeFocused();
  await page.keyboard.press(focusNext);

  const sensor = page.getByRole("combobox", { name: "Reference sensor" });
  await expect(sensor).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(sensor).toHaveValue(/full-frame reference/i);

  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toBeFocused();
  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("spinbutton", { name: "Aperture" }),
  ).toBeFocused();
  await page.keyboard.press(focusNext);

  await expect(page.getByRole("radio", { name: "1×" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "2×" })).toBeChecked();
  await page.keyboard.press(focusNext);

  const seeing = page.getByRole("slider", { name: "Seeing" });
  await expect(seeing).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(seeing).toHaveAttribute("aria-valuetext", "2.1 arcseconds");
});

test("reference controls update results locally without API latency", async ({
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

  const seeing = page.getByRole("slider", { name: "Seeing" });
  await seeing.press("End");

  await expect(
    page.getByText("Broadly appropriate for many conditions"),
  ).toBeVisible();
  expect(networkCalls).toEqual([]);
});

test("controls meet minimum pointer targets and expose visible focus", async ({
  page,
}) => {
  await page.goto("/calculators/field-of-view");

  for (const control of [
    page.getByRole("combobox", { name: "Reference sensor" }),
    page.getByRole("spinbutton", { name: "Native focal length" }),
    page.getByRole("spinbutton", { name: "Aperture" }),
    page.getByRole("slider", { name: "Seeing" }),
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
    page.getByRole("heading", { name: "Reference results" }),
  ).toBeVisible();
});

test("reduced-motion preference suppresses non-essential motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/calculators/field-of-view");

  const durations = await page
    .getByRole("combobox", { name: "Reference sensor" })
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
