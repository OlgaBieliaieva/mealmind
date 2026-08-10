import type { CuratedProduct } from "./types.js";

export type UsdaNutrientValueType =
  "ANALYTICAL" | "DERIVED" | "ESTIMATED" | "CALCULATED" | "UNKNOWN";

export interface ExtractedProductNutrient {
  readonly nutrientId: string;

  readonly nutrientCode: string;

  /**
   * Actual USDA source nutrient ID used for this value.
   *
   * For energy_kcal this can be:
   *
   * 1008 - Energy
   * 2048 - Energy (Atwater Specific Factors)
   * 2047 - Energy (Atwater General Factors)
   */
  readonly usdaNutrientId: number;

  /**
   * USDA food_nutrient.amount is expressed per 100 g
   * for Foundation Food and SR Legacy reference foods.
   */
  readonly valuePer100g: number;

  readonly valueType: UsdaNutrientValueType;

  /**
   * Original USDA food_nutrient row identifier.
   */
  readonly sourceRowId: string | null;

  /**
   * Original USDA nutrient derivation identifier.
   *
   * The derivation semantics are intentionally preserved
   * without being interpreted at this stage.
   */
  readonly sourceDerivationExternalId: string | null;

  /**
   * Number of source data points reported by USDA,
   * when available.
   */
  readonly sourceDataPoints: number | null;
}

/**
 * A curated USDA product that passed the nutrient
 * completeness gate and is ready for subsequent
 * MealMind import stages.
 *
 * Products without a supported Energy source are not
 * included in the final ExtractedNutrientsDocument.
 */
export interface ProductWithExtractedNutrients extends CuratedProduct {
  readonly nutrients: readonly ExtractedProductNutrient[];
}

/**
 * Statistics for the USDA nutrient extraction stage.
 *
 * This stage receives curated products and applies
 * an additional nutrient completeness gate.
 *
 * Energy is required for a product to continue to the
 * next import stage.
 */
export interface NutrientExtractionStatistics {
  /**
   * Number of products received from curated-products.json.
   */
  readonly inputProductsTotal: number;

  /**
   * Number of products emitted to
   * curated-product-nutrients.json after the nutrient
   * completeness gate.
   */
  readonly outputProductsTotal: number;

  /**
   * Number of output products that contain at least
   * one extracted MealMind nutrient.
   *
   * Under the current Energy quality gate this should
   * normally equal outputProductsTotal.
   */
  readonly productsWithNutrients: number;

  /**
   * Number of output products with no extracted nutrients.
   *
   * Under the current pipeline policy this should
   * normally be zero.
   */
  readonly productsWithoutNutrients: number;

  /**
   * Products excluded from this stage because USDA
   * provides none of the supported Energy sources:
   *
   * 1008 -> 2048 -> 2047
   */
  readonly productsExcludedForMissingEnergy: number;

  /**
   * Total number of canonical MealMind nutrient values
   * emitted across all output products.
   */
  readonly extractedNutrientValues: number;

  /**
   * USDA food_nutrient rows ignored during extraction
   * because they do not belong to the curated catalog
   * or cannot be mapped to a supported canonical nutrient.
   */
  readonly ignoredNutrientRows: number;

  /**
   * Number of canonical MealMind nutrients configured
   * in the nutrient whitelist.
   *
   * Alternative USDA Energy source IDs do not increase
   * this number.
   */
  readonly whitelistNutrients: number;

  /**
   * Number of canonical MealMind nutrients represented
   * at least once in the output dataset.
   */
  readonly representedWhitelistNutrients: number;

  /**
   * Number of output products whose canonical
   * energy_kcal value came directly from USDA nutrient 1008.
   */
  readonly energySource1008Products: number;

  /**
   * Number of output products whose canonical
   * energy_kcal value used USDA nutrient 2048
   * as the fallback source.
   */
  readonly energySource2048Products: number;

  /**
   * Number of output products whose canonical
   * energy_kcal value used USDA nutrient 2047
   * as the fallback source.
   */
  readonly energySource2047Products: number;
}

export interface ExtractedNutrientsDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: NutrientExtractionStatistics;

  /**
   * Only nutrient-ready products are present here.
   *
   * Curated products without a supported Energy source
   * are intentionally omitted.
   */
  readonly products: readonly ProductWithExtractedNutrients[];
}
