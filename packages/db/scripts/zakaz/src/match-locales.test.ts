import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { AggregatedProductsDocument, AggregatedZakazProduct } from "./aggregate-products.js";
import { matchLocaleDocuments, parseMatchLocalesArguments } from "./match-locales.js";

test("matches globally by store and SKU regardless of category and page", () => {
  const source = document("en", [
    product("store-1", "sku-1", "source-category", 8, {
      ean: "04820000000001",
      unit: "pcs",
      weight: 500,
      title: "Milk",
    }),
  ]);
  const localized = document("uk", [
    product("store-1", "sku-1", "another-category", 1, {
      ean: "04820000000001",
      unit: "pcs",
      weight: 500,
      title: "Молоко",
    }),
  ]);

  const result = matchLocaleDocuments(source, localized, "2026-10-06T12:00:00.000Z");

  assert.equal(result.products.length, 1);
  assert.equal(result.products[0]?.matchStatus, "MATCHED");
  assert.deepEqual(result.products[0]?.identityConflicts, []);
  assert.equal(result.products[0]?.source?.selectedObservation.pageNumber, 8);
  assert.equal(result.products[0]?.localized?.selectedObservation.pageNumber, 1);
  assert.equal(result.statistics.sourceMatchRatePercent, 100);
});

test("keeps source-only and localized-only products", () => {
  const result = matchLocaleDocuments(
    document("en", [product("store-1", "source-only", "milk", 1, baseData())]),
    document("uk", [product("store-1", "localized-only", "milk", 1, baseData())]),
  );

  assert.deepEqual(
    result.products.map((product) => [product.identity.sourceSku, product.matchStatus]),
    [
      ["localized-only", "LOCALIZED_ONLY"],
      ["source-only", "SOURCE_ONLY"],
    ],
  );
  assert.equal(result.statistics.sourceOnlyProducts, 1);
  assert.equal(result.statistics.localizedOnlyProducts, 1);
});

test("does not match the same SKU across different stores", () => {
  const result = matchLocaleDocuments(
    document("en", [product("store-1", "sku-1", "milk", 1, baseData())]),
    document("uk", [product("store-2", "sku-1", "milk", 1, baseData())]),
  );

  assert.deepEqual(
    result.products.map((product) => product.matchStatus),
    ["SOURCE_ONLY", "LOCALIZED_ONLY"],
  );
});

test("routes GTIN and package divergence to manual review", () => {
  const result = matchLocaleDocuments(
    document("en", [
      product("store-1", "sku-1", "milk", 1, {
        ...baseData(),
        ean: "04820000000001",
        pack_amount: 12,
      }),
    ]),
    document("uk", [
      product("store-1", "sku-1", "milk", 1, {
        ...baseData(),
        ean: "04820000000002",
      }),
    ]),
  );

  assert.equal(result.products[0]?.matchStatus, "MATCH_REVIEW_REQUIRED");
  assert.deepEqual(
    result.products[0]?.identityConflicts.map((conflict) => conflict.field),
    ["ean", "pack_amount"],
  );
  assert.equal(result.statistics.identityConflictCounts.ean, 1);
  assert.equal(result.statistics.identityConflictCounts.pack_amount, 1);
});

test("treats localized text and brand names as non-identity differences", () => {
  const result = matchLocaleDocuments(
    document("en", [
      product("store-1", "sku-1", "milk", 1, {
        ...baseData(),
        title: "Milk",
        description: "English description",
        producer: { trademark: "Without brand" },
      }),
    ]),
    document("uk", [
      product("store-1", "sku-1", "milk", 1, {
        ...baseData(),
        title: "Молоко",
        description: "Український опис",
        ingredients: ["Молоко"],
        producer: { trademark: "Без бренду" },
      }),
    ]),
  );

  assert.equal(result.products[0]?.matchStatus, "MATCHED");
  assert.equal(result.statistics.localizedCoverage.title, 1);
  assert.equal(result.statistics.localizedCoverage.description, 1);
  assert.equal(result.statistics.localizedCoverage.ingredients, 1);
});

test("produces stable fingerprints for property order changes", () => {
  const first = matchLocaleDocuments(
    document("en", [product("store-1", "sku-1", "milk", 1, { ean: "1", unit: "pcs" })]),
    document("uk", [product("store-1", "sku-1", "milk", 1, { ean: "1", unit: "pcs" })]),
  );
  const second = matchLocaleDocuments(
    document("en", [product("store-1", "sku-1", "milk", 1, { unit: "pcs", ean: "1" })]),
    document("uk", [product("store-1", "sku-1", "milk", 1, { unit: "pcs", ean: "1" })]),
  );

  assert.equal(first.products[0]?.sourceFingerprint, second.products[0]?.sourceFingerprint);
  assert.equal(first.products[0]?.localizedFingerprint, second.products[0]?.localizedFingerprint);
});

test("rejects duplicate store and SKU keys", () => {
  const duplicate = product("store-1", "sku-1", "another-category", 2, baseData());
  assert.throws(
    () =>
      matchLocaleDocuments(
        document("en", [product("store-1", "sku-1", "milk", 1, baseData()), duplicate]),
        document("uk", []),
      ),
    /duplicate store \+ SKU/u,
  );
});

test("builds default aggregate inputs and matched output paths", () => {
  const options = parseMatchLocalesArguments([]);
  assert.equal(options.sourceLocale, "en");
  assert.equal(options.localizedLocale, "uk");
  assert.equal(
    options.sourceInputFile,
    path.resolve("scripts/zakaz/data/work/products-en-aggregated.json"),
  );
  assert.equal(
    options.localizedInputFile,
    path.resolve("scripts/zakaz/data/work/products-uk-aggregated.json"),
  );
  assert.equal(
    options.outputFile,
    path.resolve("scripts/zakaz/data/work/products-en-uk-matched.json"),
  );
});

function document(
  locale: string,
  products: readonly AggregatedZakazProduct[],
): AggregatedProductsDocument {
  return {
    schema: "mealmind.zakaz.aggregated-products/v1",
    generatedAt: "2026-10-06T00:00:00.000Z",
    provider: "ZAKAZ",
    locale,
    statistics: {
      stores: new Set(products.map((product) => product.sourceStoreId)).size,
      sourcePages: products.length,
      inputObservations: products.length,
      uniqueProducts: products.length,
      duplicateObservations: 0,
      multiCategoryProducts: 0,
      productsWithConflicts: 0,
    },
    products,
  };
}

function product(
  sourceStoreId: string,
  sourceSku: string,
  sourceCategoryId: string,
  pageNumber: number,
  productData: Record<string, unknown>,
): AggregatedZakazProduct {
  const observation = {
    sourceCategoryId,
    pageNumber,
    sourceFile: `en/stores/${sourceStoreId}/products/${sourceCategoryId}/page-${String(pageNumber).padStart(6, "0")}.json`,
  };
  return {
    sourceStoreId,
    sourceSku,
    sourceCategoryIds: [sourceCategoryId],
    observationCount: 1,
    selectedObservation: observation,
    observations: [observation],
    conflictingFields: [],
    productData,
  };
}

function baseData(): Record<string, unknown> {
  return { ean: "04820000000001", unit: "pcs", weight: 500, title: "Milk" };
}
