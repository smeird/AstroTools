import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const equipment =
  "/equipment?v=1&n=Garden%20Rig&t=_manual&tm=manual&fm=direct&f=600&a=80&fr=7.5&c=_manual&cm=manual&cg=pixel-resolution&sw=23.5&sh=15.7&px=3.76&rw=6250&rh=4176&m=manual%3Amanual%3Areducer%3A0.7&b=2&bo=4&sqm=20.85";

test("academic view persists and never changes consolidated results", async ({
  page,
}) => {
  await page.goto(equipment);
  await page.getByRole("link", { name: "View all calculations →" }).click();
  await expect(page).toHaveTitle("Garden Rig · Calculations · Astrotools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Garden Rig",
  );
  const imageScaleCell = page
    .getByRole("region", { name: "Optical geometry result table" })
    .getByRole("row", { name: /Image scale/ })
    .getByRole("cell")
    .filter({ hasText: "3.693" });
  await expect(imageScaleCell).toBeVisible();
  const before = await imageScaleCell.textContent();
  const toggle = page.getByRole("button", {
    name: "Switch to academic view",
  });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "Switch to presentation view" }),
  ).toHaveAttribute("aria-pressed", "true");
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
  await expect(page.locator("section[id]")).toHaveCount(23);
});

test("PDF export opens the browser print workflow", async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () =>
      document.documentElement.setAttribute("data-print-called", "true");
  });
  await page.goto(equipment);
  await page.getByRole("link", { name: "View all calculations →" }).click();
  await page.getByRole("button", { name: "Export ordered PDF" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-called",
    "true",
  );
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("article", { name: "Ordered calculation report" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1. Equipment specification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "2.1 Optical geometry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "3. Method and interpretation" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toBeHidden();
  await expect(
    page.getByRole("row", { name: "Observing-site Bortle class 4" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: "Observed sky quality 20.85 mag/arcsec²",
    }),
  ).toBeVisible();
});

test("consolidated calculations expose every calculator or missing input", async ({
  page,
}) => {
  await page.goto(equipment);
  await expect(
    page.getByRole("heading", { name: "Setup check" }),
  ).toBeVisible();
  await page.goto("/calculations");
  await expect(page.locator("section[id]")).toHaveCount(23);
  await expect(
    page.getByText(
      "Add guide-scope focal length and guide-camera pixel pitch.",
      { exact: true },
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
