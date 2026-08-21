import { buildImportReadyProducts } from "./build-import-ready-products.js";

import { readJsonFile } from "./read-json.js";
import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type { NormalizedPortionsDocument } from "./portion-normalization-types.js";

export async function generateImportReadyProducts(): Promise<ImportReadyProductsDocument> {
  console.info("Building USDA import-ready product dataset...\n");

  console.info(`Input:  ${USDA_PATHS.normalizedPortionsFile}`);

  console.info(`Output: ${USDA_PATHS.importReadyProductsFile}`);

  const normalized = await readJsonFile<NormalizedPortionsDocument>(
    USDA_PATHS.normalizedPortionsFile,
  );

  if (normalized.schemaVersion !== 1) {
    throw new Error(
      `Unsupported normalized portions schema version: ${String(normalized.schemaVersion)}.`,
    );
  }

  const document = buildImportReadyProducts({
    normalized,
  });

  await writeJsonFile(USDA_PATHS.importReadyProductsFile, document);

  console.info("\nImport-ready dataset completed:");

  console.info(`input products:             ${document.statistics.inputProductsTotal}`);

  console.info(`output products:            ${document.statistics.outputProductsTotal}`);

  console.info(`nutrient values:            ${document.statistics.nutrientValuesTotal}`);

  console.info(`portions:                   ${document.statistics.portionsTotal}`);

  console.info(`products with portions:     ${document.statistics.productsWithPortions}`);

  console.info(`products without portions:  ${document.statistics.productsWithoutPortions}`);

  console.info(`translated products:        ${document.statistics.translatedProducts}`);

  console.info(`untranslated products:      ${document.statistics.untranslatedProducts}`);

  console.info(`\nOutput: ${USDA_PATHS.importReadyProductsFile}`);

  return document;
}
