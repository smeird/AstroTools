import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("exposure SNR uses the full train and updates the stack", async ({
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
        sensorWidthMm: "20",
        sensorHeightMm: "15",
      }),
    ),
  );
  await page.goto("/calculators/exposure-snr");
  await expect(page.getByLabel("Effective focal length")).toHaveValue("700");
  await expect(page.getByLabel("Binning")).toHaveValue("2");
  await expect(page.getByText("2.357″ / px")).toBeVisible();
  await page.getByLabel("Frame count").fill("120");
  await expect(page.getByText("4.00 h")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("exposure SNR has no narrow overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/calculators/exposure-snr");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
