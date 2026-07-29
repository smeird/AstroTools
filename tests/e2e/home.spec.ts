import { expect, test } from "@playwright/test";

test("a visitor can reach the Field of View Lab from the homepage", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.headers()["x-powered-by"]).toBeUndefined();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Plan the frame before the sky gets dark.",
  );
  await page.getByRole("link", { name: "Open the field lab" }).click();

  await expect(page).toHaveURL(/\/calculators\/field-of-view$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Frame the sky with confidence.",
    }),
  ).toBeVisible();

  const returnHomeBox = await page
    .getByRole("link", { name: "All calculators" })
    .boundingBox();
  expect(returnHomeBox?.height).toBeGreaterThanOrEqual(44);
});

test("the primary journey is keyboard operable", async ({
  browserName,
  page,
}) => {
  await page.goto("/");
  const focusNext = browserName === "webkit" ? "Alt+Tab" : "Tab";

  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  await page.keyboard.press(focusNext);
  await expect(
    page.getByRole("link", { name: "Open the field lab" }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/calculators\/field-of-view$/);
});

test("primary links meet the minimum pointer target height", async ({
  page,
}) => {
  await page.goto("/");

  for (const name of [
    "Skip to main content",
    "Astrotools home",
    "Open the field lab",
  ]) {
    const box = await page.getByRole("link", { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
