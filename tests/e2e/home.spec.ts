import { expect, test } from "@playwright/test";

test("a visitor can start the equipment-first journey from the homepage", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Know your rig before you lose the night.",
  );
  await expect(page.getByText("23", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Field of View/ }),
  ).toHaveAttribute("href", "/calculators/field-of-view");
  await page.getByRole("link", { name: "Build or open my rig" }).click();
  await expect(page).toHaveURL(/\/equipment$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "One setup. Complete equipment context.",
    }),
  ).toBeVisible();
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
    page.getByRole("link", { name: "Build or open my rig" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/equipment$/);
});

test("primary links meet the minimum pointer target height", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of [
    "Skip to main content",
    "Astrotools home",
    "Build or open my rig",
  ]) {
    const box = await page.getByRole("link", { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("academic view uses condensed typography without changing content", async ({
  page,
}) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  const before = await heading.textContent();
  await page
    .getByRole("button", { name: "Use academic information-dense view" })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-mode",
    "academic",
  );
  expect(
    await heading.evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("Aptos");
  expect(
    await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  expect(
    await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(24, 33, 36)");
  await expect(heading).toHaveText(before ?? "");

  await page.goto("/calculators/optimal-sub-exposure");
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-mode",
    "academic",
  );
  expect(
    await page
      .getByLabel("Read noise")
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
});
