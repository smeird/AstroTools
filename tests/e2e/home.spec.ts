import { expect, test } from "@playwright/test";

test("a visitor can start the equipment-first journey from the homepage", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One equipment profile.Every calculation.",
  );
  await expect(page.getByText("Search all 23 calculators")).toBeVisible();
  await page.getByText("Optics & framing", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: /^Field of View/ }),
  ).toHaveAttribute("href", "/calculators/field-of-view");
  await page.getByRole("link", { name: "Create my equipment profile" }).click();
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
    page.getByRole("link", { name: "Create my equipment profile" }),
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
    "Create my equipment profile",
  ]) {
    const box = await page.getByRole("link", { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("a returning visitor sees their saved rig and planning shortcuts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "astrotools.equipment-workspace.v1",
      "v=1&t=widefield-refractor&tm=manual&fm=direct&f=600&a=100&fr=6&c=cooled-camera&cm=manual&cg=physical-dimensions&sw=23.5&sh=15.7&px=3.76&rw=6248&rh=4176&b=1&n=Garden+Rig&bo=4",
    );
    localStorage.setItem(
      "astrotools.favourite-calculators.v1",
      JSON.stringify(["resolution-and-sampling"]),
    );
  });
  await page.goto("/");
  await expect(page.getByText("Garden Rig", { exact: true })).toBeVisible();
  await expect(page.getByText("1.29″/px", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Resolution & Sampling/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open my saved rig" }),
  ).toHaveAttribute("href", /\/equipment\?.*n=Garden\+Rig/);
});

test("academic view uses condensed typography without changing content", async ({
  page,
}) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  const before = await heading.textContent();
  await page.getByRole("button", { name: "Switch to academic view" }).click();
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
