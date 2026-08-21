import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductNameTranslationBatch,
  mergeProductNameTranslations,
} from "./product-name-translation-batch.js";

import type {
  ProductNameTranslationInputDocument,
  ProductNameTranslationInputItem,
  ProductNameTranslationsDocument,
} from "./product-name-translation-types.js";

function createItem(key: string, fdcId: number): ProductNameTranslationInputItem {
  return {
    key,

    fdcId,

    nameEn: `Product ${fdcId}`,

    categoryCode: "fruits",

    preparationMethod: "RAW",

    foodState: "RAW",

    modifiersEn: [],
  };
}

function createSource(): ProductNameTranslationInputDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: 3,

      translationItemsTotal: 3,
    },

    items: [createItem("A", 100), createItem("B", 200), createItem("C", 300)],
  };
}

function createTranslations(): ProductNameTranslationsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      translationItemsTotal: 3,

      translatedItemsTotal: 1,
    },

    translations: [
      {
        key: "A",

        nameUa: "Продукт 100",
      },
    ],
  };
}

test("builds the first product-name translation batch", () => {
  const result = buildProductNameTranslationBatch({
    source: createSource(),

    existingTranslations: null,

    batchSize: 2,
  });

  assert.deepEqual(
    result.items.map((item) => item.key),
    ["A", "B"],
  );

  assert.deepEqual(result.statistics, {
    sourceItemsTotal: 3,

    alreadyTranslatedItems: 0,

    remainingItems: 3,

    batchItemsTotal: 2,
  });
});

test("skips already translated items", () => {
  const result = buildProductNameTranslationBatch({
    source: createSource(),

    existingTranslations: createTranslations(),

    batchSize: 2,
  });

  assert.deepEqual(
    result.items.map((item) => item.key),
    ["B", "C"],
  );

  assert.equal(result.statistics.alreadyTranslatedItems, 1);

  assert.equal(result.statistics.remainingItems, 2);
});

test("returns a partial final batch", () => {
  const result = buildProductNameTranslationBatch({
    source: createSource(),

    existingTranslations: createTranslations(),

    batchSize: 10,
  });

  assert.equal(result.items.length, 2);
});

test("rejects invalid batch size", () => {
  assert.throws(
    () =>
      buildProductNameTranslationBatch({
        source: createSource(),

        existingTranslations: null,

        batchSize: 0,
      }),
    /Invalid product-name translation batch size/,
  );
});

test("merges a completed translation batch", () => {
  const result = mergeProductNameTranslations({
    source: createSource(),

    existingTranslations: createTranslations(),

    newTranslations: [
      {
        key: "B",

        nameUa: "Продукт 200",
      },

      {
        key: "C",

        nameUa: "Продукт 300",
      },
    ],
  });

  assert.equal(result.statistics.translationItemsTotal, 3);

  assert.equal(result.statistics.translatedItemsTotal, 3);

  assert.deepEqual(
    result.translations.map((translation) => translation.key),
    ["A", "B", "C"],
  );
});

test("trims Ukrainian translation values", () => {
  const result = mergeProductNameTranslations({
    source: createSource(),

    existingTranslations: null,

    newTranslations: [
      {
        key: "A",

        nameUa: "  Абіюх  ",
      },
    ],
  });

  assert.equal(result.translations[0]?.nameUa, "Абіюх");
});

test("rejects an unknown translation key", () => {
  assert.throws(
    () =>
      mergeProductNameTranslations({
        source: createSource(),

        existingTranslations: null,

        newTranslations: [
          {
            key: "UNKNOWN",

            nameUa: "Невідомий",
          },
        ],
      }),
    /Unknown product-name translation key/,
  );
});

test("does not overwrite an existing translation", () => {
  assert.throws(
    () =>
      mergeProductNameTranslations({
        source: createSource(),

        existingTranslations: createTranslations(),

        newTranslations: [
          {
            key: "A",

            nameUa: "Інший переклад",
          },
        ],
      }),
    /has already been translated/,
  );
});

test("rejects an empty Ukrainian translation", () => {
  assert.throws(
    () =>
      mergeProductNameTranslations({
        source: createSource(),

        existingTranslations: null,

        newTranslations: [
          {
            key: "A",

            nameUa: "   ",
          },
        ],
      }),
    /Empty Ukrainian translation/,
  );
});

test("translation batch processing is deterministic", () => {
  const input = {
    source: createSource(),

    existingTranslations: createTranslations(),

    batchSize: 2,
  };

  assert.deepEqual(
    buildProductNameTranslationBatch(input),
    buildProductNameTranslationBatch(input),
  );
});
