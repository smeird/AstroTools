import { expect, test } from "@playwright/test";

test("search finds a quantity and favourites remain local", async ({
  page,
}) => {
  await page.goto("/find");
  const search = page.getByRole("searchbox", {
    name: "Search calculations, quantities or questions",
  });
  await search.fill("pixel scale");
  await expect(
    page.getByRole("link", { name: "Resolution & Sampling", exact: true }),
  ).toBeVisible();
  const favourite = page.getByRole("button", {
    name: "Add Resolution & Sampling to favourites",
  });
  await favourite.click();
  await expect(
    page.getByRole("navigation", { name: "Saved and recent calculators" }),
  ).toContainText("Resolution & Sampling");
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Saved and recent calculators" }),
  ).toContainText("Resolution & Sampling");
});

test("calculator context and bookmark comparison are available", async ({
  page,
}) => {
  await page.goto("/calculators/resolution-and-sampling");
  await expect(page.getByText("Browse all 23 calculators")).toBeVisible();
  await expect(
    page.getByText("About this calculation: inputs, formula and confidence"),
  ).toBeVisible();
  await page.goto("/compare");
  await page
    .getByLabel("First equipment bookmark")
    .fill(
      "https://astrotools.smeird.com/equipment?n=Widefield&f=420&a=80&px=3.76",
    );
  await page
    .getByLabel("Second equipment bookmark")
    .fill(
      "https://astrotools.smeird.com/equipment?n=Galaxy&f=2000&a=200&px=3.76",
    );
  await expect(
    page.getByRole("columnheader", { name: "Widefield" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "2000 mm" })).toBeVisible();
});
