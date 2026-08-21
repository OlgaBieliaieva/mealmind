import { access } from "node:fs/promises";

import { buildProductNameTranslationBatch } from "./product-name-translation-batch.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type {
  ProductNameTranslationInputDocument,
  ProductNameTranslationsDocument,
} from "./product-name-translation-types.js";

const DEFAULT_BATCH_SIZE = 250;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

export async function generateProductNameTranslationBatch(
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<void> {
  console.info("Building USDA product-name translation batch...\n");

  console.info(`Source:       ${USDA_PATHS.productNameTranslationInputFile}`);

  console.info(`Translations: ${USDA_PATHS.productNameTranslationsFile}`);

  console.info(`Output:       ${USDA_PATHS.productNameTranslationBatchFile}`);

  const source = await readJsonFile<ProductNameTranslationInputDocument>(
    USDA_PATHS.productNameTranslationInputFile,
  );

  let existingTranslations: ProductNameTranslationsDocument | null = null;

  if (await fileExists(USDA_PATHS.productNameTranslationsFile)) {
    existingTranslations = await readJsonFile<ProductNameTranslationsDocument>(
      USDA_PATHS.productNameTranslationsFile,
    );
  }

  const batch = buildProductNameTranslationBatch({
    source,

    existingTranslations,

    batchSize,
  });

  await writeJsonFile(USDA_PATHS.productNameTranslationBatchFile, batch);

  console.info("\nTranslation batch completed:");

  console.info(`source items:        ${batch.statistics.sourceItemsTotal}`);

  console.info(`already translated:  ${batch.statistics.alreadyTranslatedItems}`);

  console.info(`remaining items:     ${batch.statistics.remainingItems}`);

  console.info(`batch items:         ${batch.statistics.batchItemsTotal}`);

  console.info(`\nOutput: ${USDA_PATHS.productNameTranslationBatchFile}`);
}
