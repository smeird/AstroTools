import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const equipment =
  "/equipment?v=1&t=_manual&tm=manual&fm=direct&f=600&a=80&fr=7.5&c=_manual&cm=manual&cg=pixel-resolution&sw=23.5&sh=15.7&px=3.76&rw=6250&rh=4176&m=manual%3Amanual%3Areducer%3A0.7&b=2";

test("academic view persists and never changes consolidated results", async ({
  page,
}) => {
  await page.goto(equipment);
  await page.getByRole("link", { name: "View all calculations →" }).click();
  const imageScaleCell = page
    .getByRole("region", { name: "Optical geometry result table" })
    .getByRole("row", { name: /Image scale/ })
    .getByRole("cell")
    .filter({ hasText: "3.693" });
  await expect(imageScaleCell).toBeVisible();
  const before = await imageScaleCell.textContent();
  const toggle = page.getByRole("button", {
    name: "Use academic information-dense view",
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-mode",
    "academic",
  );
  await expect(imageScaleCell).toHaveText(before ?? "");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-mode",
    "academic",
  );
  await expect(page.locator("section[id]")).toHaveCount(11);
});

test("consolidated calculations expose every calculator or missing input", async ({
  page,
}) => {
  await page.goto(equipment);
  await expect(
    page.getByRole("heading", { name: "Setup check" }),
  ).toBeVisible();
  await page.goto("/calculations");
  await expect(page.locator("section[id]")).toHaveCount(11);
  await expect(
    page.getByText(
      "Add guide-scope focal length and guide-camera pixel pitch.",
    ),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

test("academic calculations remain contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("astrotools.view-mode.v1", "academic"),
  );
  await page.goto(equipment);
  await expect(
    page.getByRole("heading", { name: "Setup check" }),
  ).toBeVisible();
  await page.goto("/calculations");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
