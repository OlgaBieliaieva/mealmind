import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type {
  ProductNameTranslationSource,
  TranslationSourceDocument,
} from "./translation-source-types.js";

export interface ExtractTranslationSourceInput {
  readonly importReady: ImportReadyProductsDocument;
}

export function extractTranslationSource(
  input: ExtractTranslationSourceInput,
): TranslationSourceDocument {
  const productNames = new Map<string, ProductNameTranslationSource>();

  const modifiers = new Set<string>();

  const portionLabels = new Set<string>();

  for (const product of input.importReady.products) {
    const nameKey = [
      product.nameEn,
      product.preparationMethod,
      product.foodState,
      product.categoryCode,
    ].join("::");

    if (!productNames.has(nameKey)) {
      productNames.set(nameKey, {
        fdcId: product.fdcId,

        nameEn: product.nameEn,

        preparationMethod: product.preparationMethod,

        foodState: product.foodState,

        categoryCode: product.categoryCode,
      });
    }

    for (const modifier of product.modifiersEn) {
      const normalized = modifier.trim();

      if (normalized) {
        modifiers.add(normalized);
      }
    }

    for (const portion of product.portions) {
      const normalized = portion.labelEn.trim();

      if (normalized) {
        portionLabels.add(normalized);
      }
    }
  }

  const sortedProductNames = [...productNames.values()].sort(
    (left, right) => left.nameEn.localeCompare(right.nameEn) || left.fdcId - right.fdcId,
  );

  const sortedModifiers = [...modifiers].sort((left, right) => left.localeCompare(right));

  const sortedPortionLabels = [...portionLabels].sort((left, right) => left.localeCompare(right));

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.importReady.schemaVersion,

    statistics: {
      productsTotal: input.importReady.products.length,

      uniqueProductNames: sortedProductNames.length,

      uniqueModifiers: sortedModifiers.length,

      uniquePortionLabels: sortedPortionLabels.length,
    },

    productNames: sortedProductNames,

    modifiers: sortedModifiers,

    portionLabels: sortedPortionLabels,
  };
}
