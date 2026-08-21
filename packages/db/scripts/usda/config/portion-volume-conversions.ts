export type UsdaVolumeMeasurementUnitCode = "cup" | "tbsp" | "tsp" | "ml" | "l";

export interface VolumeConversionRule {
  readonly sourceUnit: UsdaVolumeMeasurementUnitCode;

  /**
   * Canonical metric unit used by MealMind.
   */
  readonly targetUnit: "ml" | "l";

  /**
   * Multiplier applied to the source portion amount.
   *
   * Examples:
   *
   * 1 cup  -> 240 ml
   * 0.5 cup -> 120 ml
   * 2 tbsp -> 30 ml
   */
  readonly factor: number;
}

/**
 * USDA/FDA household-measure conversion policy.
 *
 * We deliberately use the metric equivalents used for
 * US nutrition labeling:
 *
 * 1 cup  = 240 ml
 * 1 tbsp = 15 ml
 * 1 tsp  = 5 ml
 *
 * Existing metric units remain unchanged.
 *
 * IMPORTANT:
 * ProductPortion.gramWeight is never recalculated here.
 * USDA gramWeight remains the authoritative product-specific
 * mass for the portion.
 */
export const USDA_VOLUME_CONVERSION_RULES: readonly VolumeConversionRule[] = [
  {
    sourceUnit: "cup",
    targetUnit: "ml",
    factor: 240,
  },

  {
    sourceUnit: "tbsp",
    targetUnit: "ml",
    factor: 15,
  },

  {
    sourceUnit: "tsp",
    targetUnit: "ml",
    factor: 5,
  },

  {
    sourceUnit: "ml",
    targetUnit: "ml",
    factor: 1,
  },

  {
    sourceUnit: "l",
    targetUnit: "l",
    factor: 1,
  },
] as const;

export const USDA_VOLUME_CONVERSION_BY_CODE = new Map(
  USDA_VOLUME_CONVERSION_RULES.map((rule) => [rule.sourceUnit, rule]),
);
