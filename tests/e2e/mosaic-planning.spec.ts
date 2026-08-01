import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("mosaic planning uses the full train and updates the grid", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "astrotools.shared.imaging-train.v1",
      JSON.stringify({
        version: 1,
        telescopeLabel: "Scope + reducer",
        cameraLabel: "Camera",
        nativeFocalLengthMm: "1000",
        effectiveFocalLengthMm: "700",
        apertureMm: "100",
        opticalMultiplier: "0.7",
        pixelSizeUm: "4",
        binningFactor: "2",
        sensorWidthMm: "23.5",
        sensorHeightMm: "15.7",
      }),
    ),
  );
  await page.goto("/calculators/mosaic-planning");
  await expect(page.getByLabel("Effective focal length")).toHaveValue("700");
  await expect(page.getByText("3 × 3")).toBeVisible();
  await page.getByLabel("Target width").fill("1");
  await page.getByLabel("Target height").fill("1");
  await expect(page.getByText("1 × 1")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("mosaic planning has no narrow overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/calculators/mosaic-planning");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
