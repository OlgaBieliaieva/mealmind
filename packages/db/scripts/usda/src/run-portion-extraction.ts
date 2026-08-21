import { extractPortions } from "./extract-portions.js";

import { readSelectedFoodPortions } from "./read-food-portions.js";

import { readMeasureUnits } from "./read-measure-units.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ExtractedNutrientsDocument } from "./nutrient-types.js";

export async function runPortionExtraction(): Promise<void> {
  console.info("Extracting USDA portions for nutrient-ready products...\n");

  console.info(`Products:      ${USDA_PATHS.curatedProductNutrientsFile}`);

  console.info(`Portions:      ${USDA_PATHS.foodPortionFile}`);

  console.info(`Measure units: ${USDA_PATHS.measureUnitFile}`);

  console.info(`Output:        ${USDA_PATHS.extractedPortionsFile}`);

  const nutrientReady = await readJsonFile<ExtractedNutrientsDocument>(
    USDA_PATHS.curatedProductNutrientsFile,
  );

  const selectedFdcIds = new Set(nutrientReady.products.map((product) => product.fdcId));

  const [portionRows, measureUnits] = await Promise.all([
    readSelectedFoodPortions(USDA_PATHS.foodPortionFile, selectedFdcIds),

    readMeasureUnits(USDA_PATHS.measureUnitFile),
  ]);

  const result = extractPortions({
    nutrientReady,
    portionRows,
    measureUnits,
  });

  await writeJsonFile(USDA_PATHS.extractedPortionsFile, result);

  console.info("\nPortion extraction completed:");

  console.info(`  input products:              ${result.statistics.inputProductsTotal}`);

  console.info(`  products with portions:      ${result.statistics.productsWithPortions}`);

  console.info(`  products without portions:   ${result.statistics.productsWithoutPortions}`);

  console.info(`  selected portion rows:       ${result.statistics.selectedPortionRows}`);

  console.info(`  extracted portions:          ${result.statistics.extractedPortions}`);

  console.info(`  zero amount portions:        ${result.statistics.zeroAmountPortions}`);

  console.info(`  undetermined unit portions:  ${result.statistics.undeterminedUnitPortions}`);

  console.info(`  missing unit portions:       ${result.statistics.missingUnitPortions}`);

  console.info(
    `  distinct source units:       ${result.statistics.distinctSourceMeasurementUnits}`,
  );

  console.info(`\nOutput: ${USDA_PATHS.extractedPortionsFile}`);
}
