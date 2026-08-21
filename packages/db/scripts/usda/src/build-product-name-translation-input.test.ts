import assert from "node:assert/strict";
import test from "node:test";

import { buildProductNameTranslationInput } from "./build-product-name-translation-input.js";

import type { ImportReadyProduct, ImportReadyProductsDocument } from "./import-ready-types.js";

function createProduct(overrides: Partial<ImportReadyProduct> = {}): ImportReadyProduct {
  return {
    fdcId: 100,

    nameEn: "Rice, brown",

    nameUa: null,

    categoryId: "category-rice",

    categoryCode: "rice",

    defaultMeasurementUnitId: "unit-g",

    defaultMeasurementUnitCode: "g",

    preparationMethod: "RAW",

    foodState: "RAW",

    modifiersEn: ["not prepared"],

    modifiersUa: [],

    unclassifiedParts: [],

    nutrients: [],

    portions: [],

    source: {
      provider: "USDA",

      fdcId: 100,

      dataset: "FOUNDATION_FOOD",

      dataType: "foundation_food",

      originalDescription: "Rice, brown, raw",

      foodCategoryExternalId: "20",

      publicationDate: null,

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

      portionsTotal: 0,

      productsWithPortions: 0,

      productsWithoutPortions: products.length,

      translatedProducts: 0,

      untranslatedProducts: products.length,
    },

    products,
  };
}

test("builds contextual product-name translation input", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([createProduct()]),
  });

  assert.equal(result.items.length, 1);

  assert.deepEqual(result.items[0], {
    key: "Rice, brown::rice::RAW::RAW::not prepared",

    fdcId: 100,

    nameEn: "Rice, brown",

    categoryCode: "rice",

    preparationMethod: "RAW",

    foodState: "RAW",

    modifiersEn: ["not prepared"],
  });
});

test("deduplicates identical translation context", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,
      }),

      createProduct({
        fdcId: 200,
      }),
    ]),
  });

  assert.equal(result.statistics.inputProductsTotal, 2);

  assert.equal(result.statistics.translationItemsTotal, 1);
});

test("keeps same English name when category differs", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,

        nameEn: "Product",

        categoryCode: "rice",
      }),

      createProduct({
        fdcId: 200,

        nameEn: "Product",

        categoryCode: "vegetables",
      }),
    ]),
  });

  assert.equal(result.items.length, 2);
});

test("keeps same English name when preparation differs", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,

        preparationMethod: "RAW",
      }),

      createProduct({
        fdcId: 200,

        preparationMethod: "BOILED",
      }),
    ]),
  });

  assert.equal(result.items.length, 2);
});

test("keeps same English name when modifiers differ", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,

        modifiersEn: ["without salt"],
      }),

      createProduct({
        fdcId: 200,

        modifiersEn: ["with salt"],
      }),
    ]),
  });

  assert.equal(result.items.length, 2);
});

test("modifier order does not create a duplicate translation context", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,

        modifiersEn: ["without salt", "skinless"],
      }),

      createProduct({
        fdcId: 200,

        modifiersEn: ["skinless", "without salt"],
      }),
    ]),
  });

  assert.equal(result.items.length, 1);
});

test("calculates translation input statistics", () => {
  const result = buildProductNameTranslationInput({
    importReady: createDocument([
      createProduct({
        fdcId: 100,
      }),

      createProduct({
        fdcId: 200,

        categoryCode: "grains_cereals",
      }),
    ]),
  });

  assert.deepEqual(result.statistics, {
    inputProductsTotal: 2,

    translationItemsTotal: 2,
  });
});

test("product-name translation input is deterministic", () => {
  const importReady = createDocument([
    createProduct({
      fdcId: 200,

      nameEn: "Chicken",
    }),

    createProduct({
      fdcId: 100,

      nameEn: "Apple",
    }),
  ]);

  const first = buildProductNameTranslationInput({
    importReady,
  });

  const second = buildProductNameTranslationInput({
    importReady,
  });

  assert.deepEqual(first, second);
});
