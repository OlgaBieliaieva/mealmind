import { extractNutrients } from "./extract-nutrients.js";

import { readSelectedFoodNutrients } from "./read-food-nutrients.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { CuratedProductsDocument } from "./types.js";

export async function runNutrientExtraction(): Promise<void> {
  console.log("Extracting USDA nutrients for curated products...");

  console.log("");

  console.log(`Curated products: ${USDA_PATHS.curatedProductsFile}`);

  console.log(`Nutrient source:  ${USDA_PATHS.foodNutrientFile}`);

  console.log(`Output:           ${USDA_PATHS.curatedProductNutrientsFile}`);

  /**
   * Read the already-curated USDA catalog.
   *
   * At this stage curated-products.json is expected to contain
   * only products approved by the catalog curation stage.
   */
  const curated = await readJsonFile<CuratedProductsDocument>(USDA_PATHS.curatedProductsFile);

  /**
   * Build a constant-time lookup set for the FDC IDs
   * that survived curation.
   */
  const selectedFdcIds = new Set<number>(curated.products.map((product) => product.fdcId));

  if (selectedFdcIds.size !== curated.products.length) {
    throw new Error("Curated catalog contains duplicate FDC IDs.");
  }

  console.log("");

  console.log(`Selected curated FDC IDs: ${selectedFdcIds.size}`);

  /**
   * Stream food_nutrient.csv and retain only:
   *
   * - rows belonging to curated FDC IDs;
   * - nutrients contained in the MealMind whitelist.
   *
   * The complete USDA CSV is never loaded into memory.
   */
  const foodNutrientRows = await readSelectedFoodNutrients(
    USDA_PATHS.foodNutrientFile,
    selectedFdcIds,
  );

  console.log(`Selected nutrient rows:   ${foodNutrientRows.length}`);

  /**
   * Map USDA nutrient IDs to canonical MealMind nutrients,
   * validate uniqueness and build deterministic output.
   */
  const result = extractNutrients({
    curated,
    foodNutrientRows,
  });

  await writeJsonFile(USDA_PATHS.curatedProductNutrientsFile, result);

  console.log("");
  console.log("Nutrient extraction completed:");

  console.log(`input products:             ${result.statistics.inputProductsTotal}`);

  console.log(`output products:            ${result.statistics.outputProductsTotal}`);

  console.log(`excluded missing energy:    ${result.statistics.productsExcludedForMissingEnergy}`);
  console.log(`energy from USDA 1008:      ${result.statistics.energySource1008Products}`);

  console.log(`energy from USDA 2048:      ${result.statistics.energySource2048Products}`);

  console.log(`energy from USDA 2047:      ${result.statistics.energySource2047Products}`);

  console.log(`products with nutrients:    ${result.statistics.productsWithNutrients}`);

  console.log(`products without nutrients: ${result.statistics.productsWithoutNutrients}`);

  console.log(`nutrient values:            ${result.statistics.extractedNutrientValues}`);

  console.log(`ignored nutrient rows:      ${result.statistics.ignoredNutrientRows}`);

  console.log(`whitelist nutrients:        ${result.statistics.whitelistNutrients}`);

  console.log(`represented nutrients:      ${result.statistics.representedWhitelistNutrients}`);

  console.log("");

  console.log(`Output: ${USDA_PATHS.curatedProductNutrientsFile}`);
}
