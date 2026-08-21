import { buildImportReadyProduct } from "./build-import-ready-product.js";

import type { ImportReadyProductsDocument } from "./import-ready-types.js";

import type { NormalizedPortionsDocument } from "./portion-normalization-types.js";

export interface BuildImportReadyProductsInput {
  readonly normalized: NormalizedPortionsDocument;
}

export function buildImportReadyProducts(
  input: BuildImportReadyProductsInput,
): ImportReadyProductsDocument {
  const products = input.normalized.products
    .map(buildImportReadyProduct)
    .sort((left, right) => left.fdcId - right.fdcId);

  const nutrientValuesTotal = products.reduce(
    (total, product) => total + product.nutrients.length,
    0,
  );

  const portionsTotal = products.reduce((total, product) => total + product.portions.length, 0);

  const productsWithPortions = products.filter((product) => product.portions.length > 0).length;

  const translatedProducts = products.filter(
    (product) => product.nameUa !== null && product.nameUa.trim() !== "",
  ).length;

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.normalized.schemaVersion,

    statistics: {
      inputProductsTotal: input.normalized.products.length,

      outputProductsTotal: products.length,

      nutrientValuesTotal,

      portionsTotal,

      productsWithPortions,

      productsWithoutPortions: products.length - productsWithPortions,

      translatedProducts,

      untranslatedProducts: products.length - translatedProducts,
    },

    products,
  };
}
