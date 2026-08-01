import { expect, test } from "@playwright/test";

const calculators = [
  "optimal-sub-exposure",
  "integration-planner",
  "filter-exposure-planner",
  "star-saturation",
  "guiding-exposure",
  "plate-solving-scale",
  "imaging-window",
  "atmospheric-extinction",
  "calibration-frames",
  "drizzle-planner",
  "field-rotation",
  "autofocus-planning",
] as const;

test("every advanced calculator exposes inputs, results and book-style maths", async ({
  page,
}) => {
  for (const slug of calculators) {
    await page.goto(`/calculators/${slug}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Governing equation" }),
    ).toBeVisible();
    await expect(page.locator("math")).toHaveCount(1);
    await expect(page.locator("[data-calculator-diagram]")).toHaveCount(1);
    await expect(page.locator("input[type=number]")).not.toHaveCount(0);
  }
});

test("integration results respond locally and persist", async ({ page }) => {
  await page.goto("/calculators/integration-planner");
  const target = page.getByLabel("Target integration");
  await target.fill("10");
  await expect(page.getByText("200", { exact: true })).toBeVisible();
  await page.reload();
  await expect(target).toHaveValue("10");
});
