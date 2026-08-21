import assert from "node:assert/strict";
import test from "node:test";

import { buildImportReadyProducts } from "./build-import-ready-products.js";

import type {
  NormalizedPortionsDocument,
  ProductWithNormalizedPortions,
} from "./portion-normalization-types.js";

function createProduct(fdcId: number): ProductWithNormalizedPortions {
  return {
    fdcId,

    dataset: "FOUNDATION_FOOD",

    dataType: "foundation_food",

    originalDescription: "Apples, raw",

    normalizedNameEn: `Product ${fdcId}`,

    preparationMethod: "RAW",

    foodState: "RAW",

    preparationConfidence: "HIGH",

    modifiersEn: [],

    unclassifiedParts: [],

    foodCategoryExternalId: "9",

    publicationDate: "2024-10-31",

    ndbNumber: null,

    curation: {
      decisionSource: "AUTOMATIC",

      reasonCodes: ["CATEGORY_INCLUDED"],

      overrideNote: null,
    },

    nutrients: [
      {
        nutrientId: "nutrient-protein",

        nutrientCode: "protein",

        usdaNutrientId: 1003,

        valuePer100g: 1,

        valueType: "UNKNOWN",

        sourceRowId: "1",

        sourceDerivationExternalId: null,

        sourceDataPoints: null,
      },
    ],

    portions: [],
  } as ProductWithNormalizedPortions;
}

function createDocument(
  products: readonly ProductWithNormalizedPortions[],
): NormalizedPortionsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: products.length,

      inputPortionsTotal: 0,

      outputProductsTotal: products.length,

      productsWithNormalizedPortions: 0,

      productsWithoutNormalizedPortions: products.length,

      normalizedPortionsTotal: 0,

      excludedPortionsTotal: 0,

      semanticDuplicatesRemoved: 0,

      excludedNonPositiveAmount: 0,

      excludedComplexLegacyMeasure: 0,

      excludedNonLocalMeasure: 0,

      excludedPackageSpecificMeasure: 0,

      excludedServingSpecificMeasure: 0,

      excludedUnsupportedMeasure: 0,

      excludedMissingMeasureLabel: 0,
    },

    products,

    excludedPortions: [],
  };
}

test("builds import-ready products", () => {
  const result = buildImportReadyProducts({
    normalized: createDocument([createProduct(100), createProduct(200)]),
  });

  assert.equal(result.products.length, 2);

  assert.equal(result.statistics.outputProductsTotal, 2);
});

test("sorts products deterministically by FDC ID", () => {
  const result = buildImportReadyProducts({
    normalized: createDocument([createProduct(300), createProduct(100), createProduct(200)]),
  });

  assert.deepEqual(
    result.products.map((product) => product.fdcId),
    [100, 200, 300],
  );
});

test("calculates import-ready statistics", () => {
  const result = buildImportReadyProducts({
    normalized: createDocument([createProduct(100), createProduct(200)]),
  });

  assert.deepEqual(result.statistics, {
    inputProductsTotal: 2,

    outputProductsTotal: 2,

    nutrientValuesTotal: 2,

    portionsTotal: 0,

    productsWithPortions: 0,

    productsWithoutPortions: 2,

    translatedProducts: 0,

    untranslatedProducts: 2,
  });
});

test("preserves all input products", () => {
  const input = createDocument([createProduct(100), createProduct(200), createProduct(300)]);

  const result = buildImportReadyProducts({
    normalized: input,
  });

  assert.equal(result.statistics.inputProductsTotal, 3);

  assert.equal(result.statistics.outputProductsTotal, 3);
});

test("import-ready dataset building is deterministic", () => {
  const normalized = createDocument([createProduct(200), createProduct(100)]);

  const first = buildImportReadyProducts({
    normalized,
  });

  const second = buildImportReadyProducts({
    normalized,
  });

  assert.deepEqual(first, second);
});
