import { expect, test } from "@playwright/test";

const calculatorSlugs = [
  "field-of-view",
  "modifier-effects",
  "resolution-and-sampling",
  "sensor-tilt",
  "backfocus-spacing",
  "guiding-ratio",
  "polar-alignment-drift",
  "exposure-snr",
  "optimal-sub-exposure",
  "integration-planner",
  "filter-exposure-planner",
  "star-saturation",
  "guiding-exposure",
  "plate-solving-scale",
  "imaging-window",
  "atmospheric-extinction",
  "mosaic-planning",
  "calibration-frames",
  "drizzle-planner",
  "field-rotation",
  "autofocus-planning",
  "dew-heater",
  "storage-volume",
] as const;

test("every calculator exposes a visible purpose and plain-language method", async ({
  page,
}) => {
  for (const slug of calculatorSlugs) {
    await page.goto(`/calculators/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What this calculator does" }),
    ).toBeVisible();
    await expect(
      page.getByText("In words:", { exact: true }).first(),
    ).toBeVisible();
  }
});

test("academic view removes presentation-only dark surfaces", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("astrotools.view-mode.v1", "academic"),
  );
  await page.goto(
    "/equipment?v=1&t=_manual&tm=manual&fm=direct&f=600&a=80&fr=7.5&c=_manual&cm=manual&cg=physical-dimensions&sw=23.5&sh=15.7&px=3.76&rw=6250&rh=4176&b=1",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-view-mode",
    "academic",
  );
  const darkDiagramAncestors = await page
    .getByRole("img", { name: /two-dimensional .* line diagram/i })
    .evaluate((element) => {
      const dark: string[] = [];
      let current: HTMLElement | null = element as HTMLElement;
      while (current && current.tagName !== "MAIN") {
        const background = getComputedStyle(current).backgroundColor;
        const match = background.match(
          /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/,
        );
        if (match) {
          const alpha = match[4] === undefined ? 1 : Number(match[4]);
          if (
            alpha > 0.25 &&
            Number(match[1]) + Number(match[2]) + Number(match[3]) < 260
          )
            dark.push(background);
        }
        current = current.parentElement;
      }
      return dark;
    });
  expect(darkDiagramAncestors).toEqual([]);

  await page.goto("/calculators/field-of-view");
  const darkControlAncestors = await page
    .getByRole("slider", { name: "Display zoom" })
    .evaluate((element) => {
      const dark: string[] = [];
      let current: HTMLElement | null = element as HTMLElement;
      while (current && current.tagName !== "MAIN") {
        const background = getComputedStyle(current).backgroundColor;
        const match = background.match(
          /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/,
        );
        if (match) {
          const alpha = match[4] === undefined ? 1 : Number(match[4]);
          if (
            alpha > 0.25 &&
            Number(match[1]) + Number(match[2]) + Number(match[3]) < 260
          )
            dark.push(background);
        }
        current = current.parentElement;
      }
      return dark;
    });
  expect(darkControlAncestors).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Switch to presentation view" }),
  ).toBeVisible();
  await expect(
    page.locator('meta[name="theme-color"][data-astrotools-view-mode]'),
  ).toHaveAttribute("content", "#ffffff");
});
