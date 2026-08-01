import { expect, test } from "@playwright/test";

for (const [name, path, minimum] of [
  ["Resolution and Sampling", "/calculators/resolution-and-sampling", 2],
  ["Reducer and Barlow", "/calculators/modifier-effects", 2],
  ["Sensor Tilt", "/calculators/sensor-tilt", 2],
  ["Back-focus Spacing", "/calculators/backfocus-spacing", 2],
] as const) {
  test(`${name} uses textbook-style structured equations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("math")).toHaveCount(minimum);
    await expect(page.locator("mfrac").first()).toBeVisible();
  });
}
