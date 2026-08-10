import { NUTRIENTS } from "./nutrients.js";

export interface UsdaNutrientWhitelistItem {
  readonly nutrientId: string;
  readonly code: string;
  readonly usdaNutrientId: number;
  readonly usdaNutrientNumber: string;
  readonly unit: "KCAL" | "G" | "MG" | "MCG";
}

export const USDA_NUTRIENT_WHITELIST = NUTRIENTS.map((nutrient): UsdaNutrientWhitelistItem => {
  return {
    nutrientId: nutrient.id,

    code: nutrient.code,

    usdaNutrientId: nutrient.usdaNutrientId,

    usdaNutrientNumber: nutrient.usdaNutrientNumber,

    unit: nutrient.unit,
  };
});

export const USDA_NUTRIENT_BY_ID = new Map(
  USDA_NUTRIENT_WHITELIST.map((nutrient) => [nutrient.usdaNutrientId, nutrient]),
);

/**
 * Canonical MealMind energy nutrient.
 */
export const USDA_ENERGY_NUTRIENT_ID = 1008;

/**
 * USDA alternative kcal calculations.
 *
 * Priority:
 *
 * 1008 - Energy
 * 2048 - Energy (Atwater Specific Factors)
 * 2047 - Energy (Atwater General Factors)
 */
export const USDA_ENERGY_SOURCE_PRIORITY = [1008, 2048, 2047] as const;

export const USDA_ENERGY_SOURCE_IDS = new Set<number>(USDA_ENERGY_SOURCE_PRIORITY);

/**
 * Source nutrient IDs that food_nutrient.csv reader
 * must retain.
 *
 * There are still only 36 canonical MealMind nutrients.
 * 2047 and 2048 are alternative USDA sources for
 * energy_kcal, not additional MealMind nutrients.
 */
export const USDA_SUPPORTED_SOURCE_NUTRIENT_IDS = new Set<number>([
  ...USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.usdaNutrientId),

  2047,
  2048,
]);

export const USDA_NUTRIENT_ID_SET = new Set(
  USDA_NUTRIENT_WHITELIST.map((nutrient) => nutrient.usdaNutrientId),
);

export function resolveCanonicalNutrient(usdaNutrientId: number): UsdaNutrientWhitelistItem | null {
  /**
   * 2047 and 2048 are alternative USDA representations
   * of the canonical MealMind energy_kcal nutrient.
   */
  if (USDA_ENERGY_SOURCE_IDS.has(usdaNutrientId)) {
    return USDA_NUTRIENT_BY_ID.get(USDA_ENERGY_NUTRIENT_ID) ?? null;
  }

  return USDA_NUTRIENT_BY_ID.get(usdaNutrientId) ?? null;
}
