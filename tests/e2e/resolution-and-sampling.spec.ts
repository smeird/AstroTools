import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("resolution and sampling updates live and has no serious accessibility findings", async ({
  page,
}) => {
  await page.goto("/calculators/resolution-and-sampling");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Know what the aperture can resolve.",
    }),
  ).toBeVisible();
  await expect(page.getByText("0.692″")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Aperture" }).fill("400");
  await expect(page.getByText("0.346″")).toBeVisible();
  await expect(page.getByText("0.45", { exact: false })).toBeVisible();

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("resolution calculator stays within the viewport on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculators/resolution-and-sampling");

  const dimensions = await page.locator("main").evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    contentWidth: element.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.contentWidth).toBe(dimensions.clientWidth);
});
