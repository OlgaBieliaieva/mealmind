import { createHash } from "node:crypto";

import type {
  CalculatedRecipeNutrient,
  ResolvedRecipeIngredient,
} from "../domain/recipe-repository.js";

export const RECIPE_CALCULATOR_VERSION = "ingredient-sum-v1";

export interface RecipeNutritionCalculation {
  readonly nutrients: readonly CalculatedRecipeNutrient[];
  readonly inputFingerprint: string;
}

export function calculateRecipeNutrition(
  ingredients: readonly ResolvedRecipeIngredient[],
): RecipeNutritionCalculation {
  const included = ingredients.filter((ingredient) => !ingredient.isOptional);
  const inputFingerprint = fingerprint(included);
  const nutrientIds = [
    ...new Set(included.flatMap((item) => item.nutrients.map((n) => n.nutrientId))),
  ].sort();

  const nutrients = nutrientIds.map((nutrientId) => {
    let total = 0;
    let coveredIngredientCount = 0;

    for (const ingredient of included) {
      const nutrient = ingredient.nutrients.find((item) => item.nutrientId === nutrientId);
      if (nutrient === undefined) continue;
      coveredIngredientCount += 1;
      total += (Number(ingredient.gramWeight) * Number(nutrient.valuePer100g)) / 100;
    }

    return Object.freeze({
      nutrientId,
      valueTotal: decimalString(total, 8),
      completeness: coveredIngredientCount === included.length ? "COMPLETE" : "PARTIAL",
      ingredientCount: included.length,
      coveredIngredientCount,
      inputFingerprint,
    }) satisfies CalculatedRecipeNutrient;
  });

  return Object.freeze({ nutrients: Object.freeze(nutrients), inputFingerprint });
}

function fingerprint(ingredients: readonly ResolvedRecipeIngredient[]): string {
  const canonical = ingredients.map((ingredient) => ({
    productId: ingredient.productId,
    gramWeight: decimalString(Number(ingredient.gramWeight), 4),
    nutrients: [...ingredient.nutrients]
      .map((item) => ({ nutrientId: item.nutrientId, valuePer100g: item.valuePer100g }))
      .sort((left, right) => left.nutrientId.localeCompare(right.nutrientId)),
  }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function decimalString(value: number, scale: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 10 ** scale) / 10 ** scale;
  return rounded.toFixed(scale).replace(/\.?0+$/, "");
}
