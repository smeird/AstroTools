import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("back-focus spacing updates, persists, and renders structured maths", async ({
  page,
}) => {
  await page.goto("/calculators/backfocus-spacing");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build the imaging train to the right depth.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Add 0.17 mm");
  await expect(page.locator("math")).toHaveCount(2);
  await expect(page.locator("mfrac")).toHaveCount(1);

  await page
    .getByRole("spinbutton", { name: "Installed spacer stack" })
    .fill("13.1667");
  await expect(page.getByRole("status")).toContainText("within ±0.10 mm");
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Installed spacer stack" }),
  ).toHaveValue("13.1667");

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("back-focus spacing fits the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculators/backfocus-spacing");
  const dimensions = await page.locator("main").evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    contentWidth: element.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.contentWidth).toBe(dimensions.clientWidth);
});
