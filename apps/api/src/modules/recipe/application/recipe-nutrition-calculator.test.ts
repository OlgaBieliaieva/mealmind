import { describe, expect, it } from "vitest";

import type { ResolvedRecipeIngredient } from "../domain/recipe-repository.js";
import { calculateRecipeNutrition } from "./recipe-nutrition-calculator.js";

function ingredient(
  productId: string,
  gramWeight: string,
  nutrients: ResolvedRecipeIngredient["nutrients"],
  isOptional = false,
): ResolvedRecipeIngredient {
  return {
    productId,
    quantity: gramWeight,
    measurementUnitId: null,
    productPortionId: null,
    gramWeight,
    conversionMethod: "MANUAL",
    isOptional,
    position: 0,
    productName: productId,
    measurementUnitSymbol: null,
    nutrients,
  };
}

describe("calculateRecipeNutrition", () => {
  it("scales per-100g values, sums ingredients and rounds deterministically", () => {
    const result = calculateRecipeNutrition([
      ingredient("apple", "150", [{ nutrientId: "energy", valuePer100g: "52" }]),
      ingredient("oats", "33.3333", [{ nutrientId: "energy", valuePer100g: "389" }]),
    ]);

    expect(result.nutrients).toEqual([
      expect.objectContaining({
        nutrientId: "energy",
        valueTotal: "207.666537",
        completeness: "COMPLETE",
        ingredientCount: 2,
        coveredIngredientCount: 2,
      }),
    ]);
    expect(result.inputFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("marks a nutrient partial when a required ingredient has no value", () => {
    const result = calculateRecipeNutrition([
      ingredient("apple", "100", [{ nutrientId: "protein", valuePer100g: "0.3" }]),
      ingredient("water", "100", []),
    ]);
    expect(result.nutrients[0]).toEqual(
      expect.objectContaining({ completeness: "PARTIAL", coveredIngredientCount: 1 }),
    );
  });

  it("excludes optional ingredients from totals and completeness", () => {
    const result = calculateRecipeNutrition([
      ingredient("required", "100", [{ nutrientId: "energy", valuePer100g: "10" }]),
      ingredient("optional", "100", [{ nutrientId: "energy", valuePer100g: "100" }], true),
    ]);
    expect(result.nutrients[0]).toEqual(
      expect.objectContaining({ valueTotal: "10", ingredientCount: 1 }),
    );
  });
});
