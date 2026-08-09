import { expect, test } from "@playwright/test";

test("a remembered telescope follows the user between relevant calculators", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "astrotools.shared.telescope-selection.v1",
      JSON.stringify({
        version: 1,
        slug: "edgehd-8-optical-tube-assembly",
        label: "Celestron EdgeHD 8-inch Optical Tube Assembly",
        nativeFocalLengthMm: "2032",
        apertureMm: "203.2",
      }),
    );
  });
  await page.goto("/calculators/modifier-effects");
  await expect(page.getByTestId("shared-equipment")).toContainText(
    "Celestron EdgeHD 8-inch Optical Tube Assembly",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toHaveValue("2032");
  await expect(page.getByRole("spinbutton", { name: "Aperture" })).toHaveValue(
    "203.2",
  );

  await page
    .getByRole("spinbutton", { name: "Native focal length" })
    .fill("1800");
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Native focal length" }),
  ).toHaveValue("1800");

  await page.getByText("Browse all 23 calculators").click();
  await page.getByRole("link", { name: "Resolution & Sampling" }).click();
  await expect(page.getByTestId("shared-equipment")).toContainText(
    "Celestron EdgeHD 8-inch Optical Tube Assembly",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Focal length" }),
  ).toHaveValue("2032");
  await expect(page.getByRole("spinbutton", { name: "Aperture" })).toHaveValue(
    "203.2",
  );

  await page.getByText("Browse all 23 calculators").click();
  await page.getByRole("link", { name: "Sensor Tilt" }).click();
  await expect(page.getByTestId("shared-equipment")).toContainText(
    "specialist measurements that are not stored",
  );
});
