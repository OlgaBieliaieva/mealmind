type FoodQuantitySource =
  | { readonly kind: "product" }
  | {
      readonly kind: "recipe";
      readonly baseServings: number | null;
      readonly yieldWeightG: number | string | null;
    };

export function defaultFoodQuantityGrams(food: FoodQuantitySource): number {
  if (food.kind === "product") return 100;

  const yieldWeight = Number(food.yieldWeightG);
  const servings = food.baseServings ?? 0;
  if (!Number.isFinite(yieldWeight) || yieldWeight <= 0 || servings <= 0) return 100;

  return Math.max(1, Math.round(yieldWeight / servings));
}
