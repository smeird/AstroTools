import { describe, expect, it } from "vitest";

import {
  catalogueListQuerySchema,
  catalogueSlugSchema,
  equipmentListQuerySchema,
} from "./catalogue-query";

describe("catalogue query schemas", () => {
  it("applies stable pagination defaults", () => {
    expect(equipmentListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("parses bounded pagination, search and manufacturer values", () => {
    expect(
      equipmentListQuerySchema.parse({
        page: "3",
        pageSize: "50",
        q: "  RedCat  ",
        manufacturer: "william-optics",
      }),
    ).toEqual({
      page: 3,
      pageSize: 50,
      q: "RedCat",
      manufacturer: "william-optics",
    });
  });

  it.each([
    { page: "0" },
    { page: "10001" },
    { page: "1.5" },
    { pageSize: "51" },
    { q: "a".repeat(101) },
    { manufacturer: "Not A Slug" },
    { unexpected: "value" },
  ])("rejects an invalid or unbounded equipment query: %o", (query) => {
    expect(equipmentListQuerySchema.safeParse(query).success).toBe(false);
  });

  it("keeps target queries independent from manufacturer filtering", () => {
    expect(
      catalogueListQuerySchema.safeParse({ manufacturer: "celestron" }).success,
    ).toBe(false);
  });

  it.each(["redcat-51", "m31", "asi2600mc-pro"])(
    "accepts a stable slug: %s",
    (slug) => {
      expect(catalogueSlugSchema.parse(slug)).toBe(slug);
    },
  );

  it("accepts the complete database slug width", () => {
    const slug = "a".repeat(191);

    expect(catalogueSlugSchema.parse(slug)).toBe(slug);
    expect(
      equipmentListQuerySchema.parse({ manufacturer: slug }).manufacturer,
    ).toBe(slug);
  });

  it.each(["", "M31", "two words", "../secret", "a".repeat(192)])(
    "rejects an invalid slug: %s",
    (slug) => {
      expect(catalogueSlugSchema.safeParse(slug).success).toBe(false);
    },
  );
});
