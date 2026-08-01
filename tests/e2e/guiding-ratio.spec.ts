import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("guiding ratio updates immediately and renders accessible equations", async ({
  page,
}) => {
  await page.goto("/calculators/guiding-ratio");

  await expect(
    page.getByRole("heading", {
      name: "Match the guider to the imaging train.",
    }),
  ).toBeVisible();
  await expect(page.getByText("4.16 : 1")).toBeVisible();
  await page.getByLabel("Guide focal length").fill("400");
  await expect(page.getByText("2.49 : 1")).toBeVisible();
  await expect(page.locator("math")).toHaveCount(2);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("guiding ratio has no narrow-screen horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/calculators/guiding-ratio");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
