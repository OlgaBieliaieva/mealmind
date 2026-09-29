import { describe, expect, it } from "vitest";

import { defaultFoodQuantityGrams } from "./default-food-quantity";

describe("defaultFoodQuantityGrams", () => {
  it("uses 100 grams for products regardless of catalog portions", () => {
    expect(defaultFoodQuantityGrams({ kind: "product" })).toBe(100);
  });

  it("uses one base recipe serving", () => {
    expect(
      defaultFoodQuantityGrams({
        kind: "recipe",
        yieldWeightG: 1120,
        baseServings: 5,
      }),
    ).toBe(224);
  });

  it("falls back to 100 grams when recipe serving data is unavailable", () => {
    expect(
      defaultFoodQuantityGrams({
        kind: "recipe",
        yieldWeightG: null,
        baseServings: null,
      }),
    ).toBe(100);
  });
});
