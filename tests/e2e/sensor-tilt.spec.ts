import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("sensor tilt updates locally and remains keyboard operable", async ({
  page,
}) => {
  await page.goto("/calculators/sensor-tilt");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Turn focus differences into a correction.",
    }),
  ).toBeVisible();
  const combinedTilt = page
    .locator("dl")
    .filter({ hasText: "Combined plane tilt" });
  await expect(combinedTilt).toContainText("0.0398°");

  const horizontal = page.getByLabel("Left-to-right focus difference");
  await horizontal.fill("36");
  await expect(combinedTilt).toContainText("0.0621°");
  await page.reload();
  await expect(page.getByLabel("Left-to-right focus difference")).toHaveValue(
    "36",
  );

  await page.getByText("Browse all 23 calculators").click();
  await page.getByRole("link", { name: "Reducer & Barlow" }).focus();
  await expect(
    page.getByRole("link", { name: "Reducer & Barlow" }),
  ).toBeFocused();

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("sensor tilt calculator stays within the mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculators/sensor-tilt");

  const dimensions = await page.locator("main").evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    contentWidth: element.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.contentWidth).toBe(dimensions.clientWidth);
});
