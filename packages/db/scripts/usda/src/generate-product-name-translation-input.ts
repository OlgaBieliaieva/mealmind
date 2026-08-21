import { buildProductNameTranslationInput } from "./build-product-name-translation-input.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type { ProductNameTranslationInputDocument } from "./product-name-translation-types.js";

export async function generateProductNameTranslationInput(): Promise<ProductNameTranslationInputDocument> {
  console.info("Building USDA product-name translation input...\n");

  console.info(`Input:  ${USDA_PATHS.importReadyProductsFile}`);

  console.info(`Output: ${USDA_PATHS.productNameTranslationInputFile}`);

  const importReady = await readJsonFile<ImportReadyProductsDocument>(
    USDA_PATHS.importReadyProductsFile,
  );

  if (importReady.schemaVersion !== 1) {
    throw new Error(
      `Unsupported import-ready schema version: ${String(importReady.schemaVersion)}.`,
    );
  }

  const document = buildProductNameTranslationInput({
    importReady,
  });

  await writeJsonFile(USDA_PATHS.productNameTranslationInputFile, document);

  console.info("\nProduct-name translation input completed:");

  console.info(`input products:       ${document.statistics.inputProductsTotal}`);

  console.info(`translation items:    ${document.statistics.translationItemsTotal}`);

  console.info(
    `deduplicated entries: ${
      document.statistics.inputProductsTotal - document.statistics.translationItemsTotal
    }`,
  );

  console.info(`\nOutput: ${USDA_PATHS.productNameTranslationInputFile}`);

  return document;
}
