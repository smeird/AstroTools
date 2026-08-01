import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("dew calculator updates and is accessible", async ({ page }) => {
  await page.goto("/calculators/dew-heater");
  await expect(
    page.getByRole("heading", {
      name: "Stay above the dew point without overheating.",
    }),
  ).toBeVisible();
  await page.getByLabel("Relative humidity").fill("95");
  await expect(page.getByText("Estimated heater power")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("storage restores camera resolution and updates volume", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "astrotools.shared.imaging-train.v1",
      JSON.stringify({
        version: 1,
        telescopeLabel: "Scope",
        cameraLabel: "Camera",
        nativeFocalLengthMm: "1000",
        effectiveFocalLengthMm: "700",
        apertureMm: "100",
        opticalMultiplier: "0.7",
        pixelSizeUm: "4",
        binningFactor: "1",
        sensorWidthMm: "20",
        sensorHeightMm: "15",
        resolutionWidthPx: "6000",
        resolutionHeightPx: "4000",
      }),
    ),
  );
  await page.goto("/calculators/storage-volume");
  await expect(page.getByLabel("Resolution width")).toHaveValue("6000");
  await page.getByLabel("Session duration").fill("8");
  await expect(page.getByText("240")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("remaining calculators have no narrow overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["dew-heater", "storage-volume"]) {
    await page.goto(`/calculators/${path}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
