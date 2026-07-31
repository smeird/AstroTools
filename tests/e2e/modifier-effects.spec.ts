import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("modifier effects update live and persist after reload", async ({
  page,
}) => {
  await page.goto("/calculators/modifier-effects");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "See exactly what the glass changes.",
    }),
  ).toBeVisible();
  await expect(page.getByText("700 mm", { exact: false })).toBeVisible();

  await page.getByRole("spinbutton", { name: "Modifier factor" }).fill("2");
  await expect(page.getByText("2,000 mm", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Reducer & Barlow" }),
  ).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Modifier factor" }),
  ).toHaveValue("2");

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("modifier effects remain within the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculators/modifier-effects");
  const dimensions = await page.locator("main").evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    contentWidth: element.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.contentWidth).toBe(dimensions.clientWidth);
});
