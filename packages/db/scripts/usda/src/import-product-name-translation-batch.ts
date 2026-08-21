import { access } from "node:fs/promises";

import { mergeProductNameTranslations } from "./product-name-translation-batch.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type {
  ProductNameTranslationInputDocument,
  ProductNameTranslationResultItem,
  ProductNameTranslationsDocument,
} from "./product-name-translation-types.js";

interface ProductNameTranslationBatchResultDocument {
  readonly schemaVersion: 1;

  readonly translations: readonly ProductNameTranslationResultItem[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

export async function importProductNameTranslationBatch(): Promise<ProductNameTranslationsDocument> {
  console.info("Importing USDA product-name translation batch...\n");

  const source = await readJsonFile<ProductNameTranslationInputDocument>(
    USDA_PATHS.productNameTranslationInputFile,
  );

  const batchResult = await readJsonFile<ProductNameTranslationBatchResultDocument>(
    USDA_PATHS.productNameTranslationBatchResultFile,
  );

  let existingTranslations: ProductNameTranslationsDocument | null = null;

  if (await fileExists(USDA_PATHS.productNameTranslationsFile)) {
    existingTranslations = await readJsonFile<ProductNameTranslationsDocument>(
      USDA_PATHS.productNameTranslationsFile,
    );
  }

  const merged = mergeProductNameTranslations({
    source,

    existingTranslations,

    newTranslations: batchResult.translations,
  });

  await writeJsonFile(USDA_PATHS.productNameTranslationsFile, merged);

  console.info("Translation batch imported:");

  console.info(`translated: ${merged.statistics.translatedItemsTotal}`);

  console.info(`total:      ${merged.statistics.translationItemsTotal}`);

  console.info(
    `remaining:  ${
      merged.statistics.translationItemsTotal - merged.statistics.translatedItemsTotal
    }`,
  );

  console.info(`\nOutput: ${USDA_PATHS.productNameTranslationsFile}`);

  return merged;
}
