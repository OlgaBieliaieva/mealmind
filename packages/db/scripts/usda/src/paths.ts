import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path to:
 *
 * packages/db/scripts/usda/src
 */
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to:
 *
 * packages/db/scripts/usda
 */
const usdaRoot = path.resolve(sourceDirectory, "..");

/**
 * Absolute path to:
 *
 * packages/db
 */
const packageRoot = path.resolve(usdaRoot, "..", "..");

/**
 * Centralized paths used by the local USDA pipeline.
 *
 * Paths are resolved relative to this module rather than process.cwd().
 * Therefore, the commands work both from packages/db and from the
 * monorepo root.
 */
export const USDA_PATHS = {
  /**
   * Root directories.
   */
  packageRoot,
  usdaRoot,
  sourceDirectory,

  dataDirectory: path.join(usdaRoot, "data"),

  rawDataDirectory: path.join(usdaRoot, "data", "raw"),

  workDataDirectory: path.join(usdaRoot, "data", "work"),

  outputDataDirectory: path.join(usdaRoot, "data", "output"),

  /**
   * Raw USDA source files.
   */
  foodFile: path.join(usdaRoot, "data", "raw", "food.csv"),

  foundationFoodFile: path.join(usdaRoot, "data", "raw", "foundation_food.csv"),

  srLegacyFoodFile: path.join(usdaRoot, "data", "raw", "sr_legacy_food.csv"),

  foodNutrientFile: path.join(usdaRoot, "data", "raw", "food_nutrient.csv"),

  /**
   * Intermediate pipeline artifacts.
   */
  selectedFoodsFile: path.join(usdaRoot, "data", "work", "selected-foods.json"),

  normalizedProductsFile: path.join(usdaRoot, "data", "work", "normalized-products.json"),

  catalogReviewFile: path.join(usdaRoot, "data", "work", "catalog-review.json"),

  curatedProductsFile: path.join(usdaRoot, "data", "work", "curated-products.json"),

  /**
   * Curated products enriched with the subset of USDA nutrients
   * supported by MealMind.
   */
  curatedProductNutrientsFile: path.join(
    usdaRoot,
    "data",
    "work",
    "curated-product-nutrients.json",
  ),
} as const;
