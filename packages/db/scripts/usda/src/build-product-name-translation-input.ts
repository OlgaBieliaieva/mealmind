import { buildProductNameTranslationKey } from "./product-name-translation-key.js";

import type { ImportReadyProduct, ImportReadyProductsDocument } from "./import-ready-types.js";

import type {
  ProductNameTranslationInputDocument,
  ProductNameTranslationInputItem,
} from "./product-name-translation-types.js";

export interface BuildProductNameTranslationInputOptions {
  readonly importReady: ImportReadyProductsDocument;
}

function buildTranslationItem(product: ImportReadyProduct): ProductNameTranslationInputItem {
  return {
    key: buildProductNameTranslationKey({
      nameEn: product.nameEn,

      categoryCode: product.categoryCode,

      preparationMethod: product.preparationMethod,

      foodState: product.foodState,

      modifiersEn: product.modifiersEn,
    }),

    fdcId: product.fdcId,

    nameEn: product.nameEn,

    categoryCode: product.categoryCode,

    preparationMethod: product.preparationMethod,

    foodState: product.foodState,

    modifiersEn: [...product.modifiersEn],
  };
}

/**
 * Builds the minimal deterministic input required for contextual
 * English -> Ukrainian product-name translation.
 *
 * Products with identical translation context are represented once.
 */
export function buildProductNameTranslationInput(
  options: BuildProductNameTranslationInputOptions,
): ProductNameTranslationInputDocument {
  const itemsByKey = new Map<string, ProductNameTranslationInputItem>();

  for (const product of options.importReady.products) {
    const item = buildTranslationItem(product);

    if (!itemsByKey.has(item.key)) {
      itemsByKey.set(item.key, item);
    }
  }

  const items = [...itemsByKey.values()].sort(
    (left, right) => left.nameEn.localeCompare(right.nameEn) || left.key.localeCompare(right.key),
  );

  return {
    schemaVersion: 1,

    sourceSchemaVersion: options.importReady.schemaVersion,

    statistics: {
      inputProductsTotal: options.importReady.products.length,

      translationItemsTotal: items.length,
    },

    items,
  };
}
