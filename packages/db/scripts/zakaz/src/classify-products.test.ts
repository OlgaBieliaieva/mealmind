import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { AggregatedProductsDocument, AggregatedZakazProduct } from "./aggregate-products.js";
import {
  classifyAggregatedProduct,
  classifyGtin,
  classifyPackage,
  classifyProductsDocument,
  parseClassifyProductsArguments,
} from "./classify-products.js";

test("normalizes valid GTIN values to GTIN-14", () => {
  assert.deepEqual(classifyGtin("4006381333931"), {
    raw: "4006381333931",
    normalized: "04006381333931",
    format: "GTIN_13",
    status: "VALID",
  });
});

test("distinguishes internal codes and invalid check digits", () => {
  assert.equal(classifyGtin("metro00000040084701").status, "NON_NUMERIC");
  assert.equal(classifyGtin("4006381333932").status, "INVALID_CHECK_DIGIT");
});

test("keeps an out-of-stock fixed package eligible", () => {
  const result = classifyAggregatedProduct(
    product({
      ean: "4006381333931",
      unit: "pcs",
      weight: 50,
      producer: { trademark: "Example" },
      in_stock: false,
      available_for_cart: false,
    }),
  );

  assert.equal(result.classification.decision, "ELIGIBLE");
  assert.equal(result.classification.availabilitySnapshot.inStock, false);
  assert.deepEqual(result.classification.reasonCodes, []);
});

test("rejects variable weight and preserves the reason", () => {
  const result = classifyAggregatedProduct(
    product({
      ean: "4006381333931",
      unit: "kg",
      producer: { trademark: "Example" },
      in_stock: true,
    }),
  );

  assert.equal(result.classification.decision, "REJECTED");
  assert.equal(result.classification.package.kind, "VARIABLE_MASS");
  assert.deepEqual(result.classification.reasonCodes, ["PACKAGE_VARIABLE_WEIGHT"]);
});

test("marks a fixed item without package measure for review", () => {
  const result = classifyAggregatedProduct(
    product({
      ean: "4006381333931",
      unit: "pcs",
      producer: { trademark: "Example" },
      in_stock: true,
    }),
  );

  assert.equal(result.classification.decision, "REVIEW_REQUIRED");
  assert.deepEqual(result.classification.reasonCodes, ["PACKAGE_MEASURE_MISSING"]);
});

test("classifies count and combined fixed packages", () => {
  assert.equal(classifyPackage({ unit: "pcs", pack_amount: 10 }).kind, "FIXED_COUNT");
  assert.equal(
    classifyPackage({ unit: "pcs", weight: 500, volume: 450 }).kind,
    "FIXED_MASS_AND_VOLUME",
  );
});

test("rejects the without-brand sentinel", () => {
  const result = classifyAggregatedProduct(
    product({
      ean: "4006381333931",
      unit: "pcs",
      weight: 50,
      producer: { trademark: "without brand" },
    }),
  );

  assert.equal(result.classification.decision, "REJECTED");
  assert.deepEqual(result.classification.reasonCodes, ["BRAND_SENTINEL_WITHOUT_BRAND"]);
});

test("reports eligible stock split without using it for eligibility", () => {
  const document: AggregatedProductsDocument = {
    schema: "mealmind.zakaz.aggregated-products/v1",
    generatedAt: "2026-10-05T00:00:00.000Z",
    provider: "ZAKAZ",
    locale: "en",
    statistics: {
      stores: 1,
      sourcePages: 1,
      inputObservations: 2,
      uniqueProducts: 2,
      duplicateObservations: 0,
      multiCategoryProducts: 0,
      productsWithConflicts: 0,
    },
    products: [
      product({
        ean: "4006381333931",
        unit: "pcs",
        weight: 50,
        producer: { trademark: "Example" },
        in_stock: true,
      }),
      product({
        ean: "9780201379624",
        unit: "pcs",
        volume: 500,
        producer: { trademark: "Example" },
        in_stock: false,
      }),
    ],
  };

  const result = classifyProductsDocument(document, "2026-10-05T00:00:00.000Z");
  assert.equal(result.statistics.eligibleProducts, 2);
  assert.equal(result.statistics.eligibleInStock, 1);
  assert.equal(result.statistics.eligibleOutOfStock, 1);
  assert.equal(result.statistics.eligibleAvailabilityUnknown, 0);
  assert.equal(result.policy.availabilityAffectsEligibility, false);
});

test("builds locale-specific classify paths", () => {
  const options = parseClassifyProductsArguments(["--locale", "en"]);
  assert.equal(
    options.inputFile,
    path.resolve("scripts/zakaz/data/work/products-en-aggregated.json"),
  );
  assert.equal(
    options.outputFile,
    path.resolve("scripts/zakaz/data/work/products-en-classified.json"),
  );
});

function product(productData: Record<string, unknown>): AggregatedZakazProduct {
  return {
    sourceStoreId: "48215611",
    sourceSku: "sku-1",
    sourceCategoryIds: ["category-metro"],
    observationCount: 1,
    selectedObservation: {
      sourceCategoryId: "category-metro",
      pageNumber: 1,
      sourceFile: "en/stores/48215611/products/category-metro/page-000001.json",
    },
    observations: [
      {
        sourceCategoryId: "category-metro",
        pageNumber: 1,
        sourceFile: "en/stores/48215611/products/category-metro/page-000001.json",
      },
    ],
    conflictingFields: [],
    productData,
  };
}
