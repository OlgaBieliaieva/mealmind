import { buildProductNameTranslationKey } from "./product-name-translation-key.js";

import { buildProductNameTranslationMap } from "./product-name-translation-resolver.js";

import type {
  ImportReadyProductPortion,
  ImportReadyProductsDocument,
} from "./import-ready-types.js";

import type { ProductNameTranslationsDocument } from "./product-name-translation-types.js";

import type { FinalProduct, FinalProductsDocument } from "./final-product-types.js";

export type ModifierTranslationResolver = (modifierEn: string) => string | null;

export type PortionTranslationResolver = (portion: ImportReadyProductPortion) => string | null;

export interface FinalizeProductsOptions {
  readonly importReady: ImportReadyProductsDocument;

  readonly nameTranslations: ProductNameTranslationsDocument;

  readonly translateModifier: ModifierTranslationResolver;

  readonly translatePortion: PortionTranslationResolver;
}

function requireTranslation(
  translation: string | null,

  context: string,
): string {
  const value = translation?.trim();

  if (!value) {
    throw new Error(`Missing Ukrainian translation for ${context}.`);
  }

  return value;
}

export function finalizeProducts(options: FinalizeProductsOptions): FinalProductsDocument {
  if (options.importReady.schemaVersion !== 1) {
    throw new Error(
      `Unsupported import-ready schema version: ${String(options.importReady.schemaVersion)}.`,
    );
  }

  const nameTranslations = buildProductNameTranslationMap(options.nameTranslations);

  const seenFdcIds = new Set<number>();

  let modifiersTotal = 0;

  let translatedModifiers = 0;

  let portionsTotal = 0;

  let translatedPortions = 0;

  const products = options.importReady.products.map((product): FinalProduct => {
    if (seenFdcIds.has(product.fdcId)) {
      throw new Error(`Duplicate FDC ID ${product.fdcId} in import-ready dataset.`);
    }

    seenFdcIds.add(product.fdcId);

    const translationKey = buildProductNameTranslationKey({
      nameEn: product.nameEn,

      categoryCode: product.categoryCode,

      preparationMethod: product.preparationMethod,

      foodState: product.foodState,

      modifiersEn: product.modifiersEn,
    });

    const nameUa = nameTranslations.get(translationKey);

    if (!nameUa) {
      throw new Error(
        [
          "Missing product-name translation.",
          `FDC ID: ${product.fdcId}.`,
          `Key: "${translationKey}".`,
        ].join(" "),
      );
    }

    const modifiersUa = product.modifiersEn.map((modifierEn) => {
      modifiersTotal += 1;

      const modifierUa = requireTranslation(
        options.translateModifier(modifierEn),
        [`modifier "${modifierEn}"`, `for product FDC ID ${product.fdcId}`].join(" "),
      );

      translatedModifiers += 1;

      return modifierUa;
    });

    const portions = product.portions.map((portion) => {
      portionsTotal += 1;

      const labelUa = requireTranslation(
        options.translatePortion(portion),
        [`portion label "${portion.labelEn}"`, `for product FDC ID ${product.fdcId}`].join(" "),
      );

      translatedPortions += 1;

      return {
        ...portion,

        labelUa,
      };
    });

    return {
      ...product,

      nameUa,

      modifiersUa,

      portions,
    };
  });

  const sortedProducts = [...products].sort((left, right) => left.fdcId - right.fdcId);

  const nutrientValuesTotal = sortedProducts.reduce(
    (total, product) => total + product.nutrients.length,
    0,
  );

  const productsWithPortions = sortedProducts.filter(
    (product) => product.portions.length > 0,
  ).length;

  return {
    schemaVersion: 1,

    sourceSchemaVersion: options.importReady.schemaVersion,

    statistics: {
      inputProductsTotal: options.importReady.products.length,

      outputProductsTotal: sortedProducts.length,

      translatedProducts: sortedProducts.length,

      untranslatedProducts: 0,

      modifiersTotal,

      translatedModifiers,

      untranslatedModifiers: modifiersTotal - translatedModifiers,

      portionsTotal,

      translatedPortions,

      untranslatedPortions: portionsTotal - translatedPortions,

      nutrientValuesTotal,

      productsWithPortions,

      productsWithoutPortions: sortedProducts.length - productsWithPortions,
    },

    products: sortedProducts,
  };
}
