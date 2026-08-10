import { normalizePortions } from "./normalize-portions.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ExtractedPortionsDocument } from "./portion-types.js";

export async function runPortionNormalization(): Promise<void> {
  console.info("Normalizing USDA portions...\n");

  console.info(`Input:  ${USDA_PATHS.extractedPortionsFile}`);

  console.info(`Output: ${USDA_PATHS.normalizedPortionsFile}`);

  const extracted = await readJsonFile<ExtractedPortionsDocument>(USDA_PATHS.extractedPortionsFile);

  const result = normalizePortions({
    extracted,
  });

  await writeJsonFile(USDA_PATHS.normalizedPortionsFile, result);

  console.info("\nPortion normalization completed:");

  console.info(`  input products:                ${result.statistics.inputProductsTotal}`);

  console.info(`  input portions:                ${result.statistics.inputPortionsTotal}`);

  console.info(`  output products:               ${result.statistics.outputProductsTotal}`);

  console.info(
    `  products with portions:        ${result.statistics.productsWithNormalizedPortions}`,
  );

  console.info(
    `  products without portions:     ${result.statistics.productsWithoutNormalizedPortions}`,
  );

  console.info(`  normalized portions:           ${result.statistics.normalizedPortionsTotal}`);

  console.info(`  excluded portions:             ${result.statistics.excludedPortionsTotal}`);

  console.info(`  semantic duplicates removed:   ${result.statistics.semanticDuplicatesRemoved}`);

  console.info(`  excluded non-positive amount:  ${result.statistics.excludedNonPositiveAmount}`);

  console.info(
    `  excluded complex legacy:       ${result.statistics.excludedComplexLegacyMeasure}`,
  );
  console.info(`  excluded non-local measure:    ${result.statistics.excludedNonLocalMeasure}`);

  console.info(
    `  excluded package-specific:     ${result.statistics.excludedPackageSpecificMeasure}`,
  );

  console.info(
    `  excluded serving-specific:     ${result.statistics.excludedServingSpecificMeasure}`,
  );
  console.info(`  excluded unsupported measure:  ${result.statistics.excludedUnsupportedMeasure}`);

  console.info(`  excluded missing label:        ${result.statistics.excludedMissingMeasureLabel}`);

  console.info(`\nOutput: ${USDA_PATHS.normalizedPortionsFile}`);
}
