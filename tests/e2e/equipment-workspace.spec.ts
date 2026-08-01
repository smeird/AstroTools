import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const manualEquipment =
  "/equipment?v=1&t=_manual&tm=manual&fm=direct&f=600&a=80&fr=7.5" +
  "&c=_manual&cm=manual&cg=physical-dimensions&sw=23.5&sh=15.7" +
  "&px=3.76&rw=6250&rh=4176&b=1";

test("a bookmarked manual setup reproduces the overview and opens calculator details", async ({
  page,
}) => {
  await page.goto(manualEquipment);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "One setup. Every useful calculation.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toHaveValue("600");
  await expect(
    page.getByRole("spinbutton", { name: "Sensor width" }),
  ).toHaveValue("23.5");
  await expect(
    page.getByRole("region", { name: "What this setup tells you" }),
  ).toContainText("2.24° × 1.50°");

  await page.getByRole("link", { name: "Open resolution details →" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Focal length" }),
  ).toHaveValue("600");
  await expect(page.getByRole("spinbutton", { name: "Aperture" })).toHaveValue(
    "80",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Pixel pitch" }),
  ).toHaveValue("3.76");

  await page.getByRole("link", { name: "My Equipment" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toHaveValue("600");
});

test("equipment URL copy is canonical and the overview is accessible", async ({
  page,
}) => {
  await page.goto(
    manualEquipment + "&target=m31-andromeda-galaxy&unknown=ignored",
  );
  await page.getByRole("button", { name: "Copy equipment URL" }).click();
  await expect(page.locator("[aria-live='polite']")).toContainText(
    /Equipment URL copied|Copy unavailable/,
  );
  const canonical = new URL(page.url());
  expect(canonical.pathname).toBe("/equipment");
  expect(canonical.searchParams.get("f")).toBe("600");
  expect(canonical.searchParams.has("target")).toBe(false);
  expect(canonical.searchParams.has("unknown")).toBe(false);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("equipment overview remains information-dense without mobile overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(manualEquipment);
  const dimensions = await page.locator("main").evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    contentWidth: element.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.contentWidth).toBe(dimensions.clientWidth);
  await expect(page.locator("article")).toHaveCount(8);
});
