import { describe, expect, it } from "vitest";

import { searchFoodSchema } from "./food-schema.js";

describe("food search schema", () => {
  it("allows an empty query for favorites and the latest recipe catalogue", () => {
    expect(searchFoodSchema.safeParse({ params: {}, query: { favorites: "true" } }).success).toBe(
      true,
    );
    expect(
      searchFoodSchema.safeParse({ params: {}, query: { query: "а", favorites: "false" } }).success,
    ).toBe(false);
    expect(
      searchFoodSchema.safeParse({ params: {}, query: { type: "recipe", favorites: "false" } })
        .success,
    ).toBe(true);
  });

  it("accepts recipe filters only for the recipe catalogue", () => {
    const recipeTypeId = "f20e6dcb-214c-4bee-aabe-0daaa83c27e6";
    expect(
      searchFoodSchema.safeParse({
        params: {},
        query: { type: "recipe", difficulty: "EASY", recipeTypeId },
      }).success,
    ).toBe(true);
    expect(
      searchFoodSchema.safeParse({
        params: {},
        query: { type: "all", query: "суп", recipeTypeId },
      }).success,
    ).toBe(false);
  });
});
