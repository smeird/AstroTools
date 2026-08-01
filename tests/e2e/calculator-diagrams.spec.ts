import { expect, test } from "@playwright/test";

const calculators = [
  ["field-of-view", "Field geometry"],
  ["modifier-effects", "Focal transformation"],
  ["resolution-and-sampling", "Diffraction and sampling"],
  ["sensor-tilt", "Sensor plane tilt"],
  ["backfocus-spacing", "Mechanical back-focus stack"],
  ["guiding-ratio", "Imaging and guiding scales"],
  ["polar-alignment-drift", "Polar drift geometry"],
  ["exposure-snr", "Signal and noise accumulation"],
  ["mosaic-planning", "Mosaic overlap grid"],
  ["dew-heater", "Dew-control geometry"],
  ["storage-volume", "Capture data flow"],
  ["optimal-sub-exposure", "Exposure envelope"],
  ["integration-planner", "Integration accumulation"],
  ["filter-exposure-planner", "Channel time allocation"],
  ["star-saturation", "Pixel-well filling"],
  ["guiding-exposure", "Guide cadence envelope"],
  ["plate-solving-scale", "Solver search geometry"],
  ["imaging-window", "Altitude and darkness window"],
  ["atmospheric-extinction", "Atmospheric light path"],
  ["calibration-frames", "Master-frame combination"],
  ["drizzle-planner", "Dithered sampling grid"],
  ["field-rotation", "Rotating field edge"],
  ["autofocus-planning", "Focus-curve sampling"],
] as const;

test("every calculator has one relevant technical figure", async ({ page }) => {
  for (const [slug, title] of calculators) {
    await page.goto(`/calculators/${slug}`);

    const figures = page.locator("[data-calculator-diagram]");
    await expect(figures, `${slug} figure count`).toHaveCount(1);
    await expect(
      figures.getByRole("img"),
      `${slug} accessible image`,
    ).toHaveAccessibleName(title);
    await expect(figures.getByRole("heading", { name: title })).toBeVisible();
  }
});

test("a technical figure does not widen a narrow calculator page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculators/mosaic-planning");

  await expect(
    page.locator('[data-calculator-diagram="mosaic-planning"]'),
  ).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
