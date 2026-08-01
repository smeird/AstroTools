import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("polar drift uses the full saved imaging train and updates locally", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      "astrotools.shared.imaging-train.v1",
      JSON.stringify({
        version: 1,
        telescopeLabel: "Test scope + reducer",
        cameraLabel: "Test camera",
        nativeFocalLengthMm: "1000",
        effectiveFocalLengthMm: "700",
        apertureMm: "100",
        opticalMultiplier: "0.7",
        pixelSizeUm: "4",
        binningFactor: "2",
        sensorWidthMm: "20",
        sensorHeightMm: "15",
      }),
    ),
  );
  await page.goto("/calculators/polar-alignment-drift");
  await expect(page.getByLabel("Effective focal length")).toHaveValue("700");
  await expect(page.getByLabel("Camera pixel pitch")).toHaveValue("4");
  await expect(page.getByLabel("Binning")).toHaveValue("2");
  await expect(page.getByText("2.357″ / px")).toBeVisible();
  await page.getByLabel("Star hour angle").fill("90");
  await expect(
    page.getByText("Low sensitivity at this hour angle"),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("polar drift has no narrow-screen overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/calculators/polar-alignment-drift");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
