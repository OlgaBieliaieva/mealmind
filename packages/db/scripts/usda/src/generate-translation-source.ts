import { extractTranslationSource } from "./extract-translation-source.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type { TranslationSourceDocument } from "./translation-source-types.js";

export async function generateTranslationSource(): Promise<TranslationSourceDocument> {
  console.info("Extracting USDA translation source...\n");

  console.info(`Input:  ${USDA_PATHS.importReadyProductsFile}`);

  console.info(`Output: ${USDA_PATHS.translationSourceFile}`);

  const importReady = await readJsonFile<ImportReadyProductsDocument>(
    USDA_PATHS.importReadyProductsFile,
  );

  if (importReady.schemaVersion !== 1) {
    throw new Error(
      `Unsupported import-ready schema version: ${String(importReady.schemaVersion)}.`,
    );
  }

  const document = extractTranslationSource({
    importReady,
  });

  await writeJsonFile(USDA_PATHS.translationSourceFile, document);

  console.info("\nTranslation source extraction completed:");

  console.info(`products:               ${document.statistics.productsTotal}`);

  console.info(`unique product names:   ${document.statistics.uniqueProductNames}`);

  console.info(`unique modifiers:       ${document.statistics.uniqueModifiers}`);

  console.info(`unique portion labels:  ${document.statistics.uniquePortionLabels}`);

  console.info(`\nOutput: ${USDA_PATHS.translationSourceFile}`);

  return document;
}
