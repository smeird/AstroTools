import { describe, expect, it } from "vitest";
import {
  calculatorBySlug,
  calculatorRegistry,
  searchCalculators,
} from "./calculator-registry";

describe("calculator registry", () => {
  it("is complete and internally linked", () => {
    expect(calculatorRegistry).toHaveLength(23);
    expect(new Set(calculatorRegistry.map(({ slug }) => slug)).size).toBe(23);
    for (const calculator of calculatorRegistry) {
      expect(calculator.formula).not.toBe("");
      expect(calculator.inputSources.length).toBeGreaterThan(0);
      calculator.related.forEach((slug) =>
        expect(calculatorBySlug(slug)).toBeDefined(),
      );
    }
  });
  it.each([
    ["pixel scale", "resolution-and-sampling"],
    ["How long should each subframe be?", "optimal-sub-exposure"],
    ["how long should my subs be", "optimal-sub-exposure"],
    ["disk space", "storage-volume"],
    ["dew", "dew-heater"],
  ])("finds %s", (query, expected) =>
    expect(searchCalculators(query)[0]?.slug).toBe(expected),
  );
});
