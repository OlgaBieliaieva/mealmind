import { finalizeProducts } from "./finalize-products.js";

import { translatePortionLabel } from "./translate-portion-label.js";

import { translateModifier } from "./translate-modifier.js";

import { readJsonFile } from "./read-json.js";

import { writeJsonFile } from "./write-json.js";

import { USDA_PATHS } from "./paths.js";

import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type { ProductNameTranslationsDocument } from "./product-name-translation-types.js";

export async function generateFinalProducts(): Promise<void> {
  console.info("Building final USDA product dataset...\n");

  console.info(`Products:     ${USDA_PATHS.importReadyProductsFile}`);

  console.info(`Translations: ${USDA_PATHS.productNameTranslationsFile}`);

  console.info(`Output:       ${USDA_PATHS.finalProductsFile}`);

  const importReady = await readJsonFile<ImportReadyProductsDocument>(
    USDA_PATHS.importReadyProductsFile,
  );

  const nameTranslations = await readJsonFile<ProductNameTranslationsDocument>(
    USDA_PATHS.productNameTranslationsFile,
  );

  const document = finalizeProducts({
    importReady,

    nameTranslations,

    translateModifier,

    translatePortion: translatePortionLabel,
  });

  await writeJsonFile(USDA_PATHS.finalProductsFile, document);

  console.info("\nFinal USDA dataset completed:");

  console.info(`  input products:          ${document.statistics.inputProductsTotal}`);

  console.info(`  output products:         ${document.statistics.outputProductsTotal}`);

  console.info(`  translated products:     ${document.statistics.translatedProducts}`);

  console.info(`  untranslated products:   ${document.statistics.untranslatedProducts}`);

  console.info(`  modifiers:               ${document.statistics.modifiersTotal}`);

  console.info(`  translated modifiers:    ${document.statistics.translatedModifiers}`);

  console.info(`  untranslated modifiers:  ${document.statistics.untranslatedModifiers}`);

  console.info(`  portions:                ${document.statistics.portionsTotal}`);

  console.info(`  translated portions:     ${document.statistics.translatedPortions}`);

  console.info(`  untranslated portions:   ${document.statistics.untranslatedPortions}`);

  console.info(`  nutrient values:         ${document.statistics.nutrientValuesTotal}`);

  console.info(`  products with portions:  ${document.statistics.productsWithPortions}`);

  console.info(`  products without:        ${document.statistics.productsWithoutPortions}`);

  console.info(`\nOutput: ${USDA_PATHS.finalProductsFile}`);
}
