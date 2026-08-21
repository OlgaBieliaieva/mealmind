import assert from "node:assert/strict";
import test from "node:test";

import { extractTranslationSource } from "./extract-translation-source.js";

import type { ImportReadyProduct, ImportReadyProductsDocument } from "./import-ready-types.js";

function createProduct(overrides: Partial<ImportReadyProduct> = {}): ImportReadyProduct {
  return {
    fdcId: 100,

    nameEn: "Apples",

    nameUa: null,

    categoryId: "category-id",

    categoryCode: "apples_pears",

    defaultMeasurementUnitId: "g-id",

    defaultMeasurementUnitCode: "g",

    preparationMethod: "RAW",

    foodState: "RAW",

    modifiersEn: ["without salt"],

    modifiersUa: [],

    unclassifiedParts: [],

    nutrients: [],

    portions: [
      {
        amount: 1,

        gramWeight: 100,

        labelEn: "slice",

        labelUa: null,

        kind: "COUNT",

        weightType: "UNKNOWN",

        measurementUnitId: null,

        measurementUnitCode: null,

        source: {
          rowId: "1",

          sequence: 1,

          measurementUnitExternalId: "9999",

          measurementUnitName: "undetermined",

          modifier: "slice",

          portionDescription: null,

          dataPoints: null,
        },
      },
    ],

    source: {
      provider: "USDA",

      fdcId: 100,

      dataset: "FOUNDATION_FOOD",

      dataType: "foundation_food",

      originalDescription: "Apples, raw",

      foodCategoryExternalId: "9",

      publicationDate: "2024-10-31",

      ndbNumber: null,
    },

    ...overrides,
  };
}

function createDocument(products: readonly ImportReadyProduct[]): ImportReadyProductsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: products.length,

      outputProductsTotal: products.length,

      nutrientValuesTotal: 0,

      portionsTotal: products.reduce((total, product) => total + product.portions.length, 0),

      productsWithPortions: products.filter((product) => product.portions.length > 0).length,

      productsWithoutPortions: products.filter((product) => product.portions.length === 0).length,

      translatedProducts: 0,

      untranslatedProducts: products.length,
    },

    products,
  };
}

test("extracts product name translation context", () => {
  const result = extractTranslationSource({
    importReady: createDocument([createProduct()]),
  });

  assert.deepEqual(result.productNames, [
    {
      fdcId: 100,

      nameEn: "Apples",

      preparationMethod: "RAW",

      foodState: "RAW",

      categoryCode: "apples_pears",
    },
  ]);
});

test("deduplicates modifiers", () => {
  const result = extractTranslationSource({
    importReady: createDocument([
      createProduct({
        fdcId: 100,
      }),

      createProduct({
        fdcId: 200,
      }),
    ]),
  });

  assert.deepEqual(result.modifiers, ["without salt"]);
});

test("deduplicates portion labels", () => {
  const result = extractTranslationSource({
    importReady: createDocument([
      createProduct({
        fdcId: 100,
      }),

      createProduct({
        fdcId: 200,
      }),
    ]),
  });

  assert.deepEqual(result.portionLabels, ["slice"]);
});

test("keeps same English name when translation context differs", () => {
  const result = extractTranslationSource({
    importReady: createDocument([
      createProduct({
        fdcId: 100,

        nameEn: "Product",

        categoryCode: "fruits",

        preparationMethod: "RAW",
      }),

      createProduct({
        fdcId: 200,

        nameEn: "Product",

        categoryCode: "grains_cereals",

        preparationMethod: "UNSPECIFIED",
      }),
    ]),
  });

  assert.equal(result.productNames.length, 2);
});

test("calculates translation source statistics", () => {
  const result = extractTranslationSource({
    importReady: createDocument([
      createProduct({
        fdcId: 100,
      }),

      createProduct({
        fdcId: 200,
      }),
    ]),
  });

  assert.deepEqual(result.statistics, {
    productsTotal: 2,

    uniqueProductNames: 1,

    uniqueModifiers: 1,

    uniquePortionLabels: 1,
  });
});

test("translation source extraction is deterministic", () => {
  const document = createDocument([
    createProduct({
      fdcId: 200,
    }),

    createProduct({
      fdcId: 100,
    }),
  ]);

  const first = extractTranslationSource({
    importReady: document,
  });

  const second = extractTranslationSource({
    importReady: document,
  });

  assert.deepEqual(first, second);
});
