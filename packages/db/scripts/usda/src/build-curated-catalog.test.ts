import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogReview } from "./build-catalog-review.js";
import { buildCuratedCatalog } from "./build-curated-catalog.js";
import type { CurationOverride, NormalizedProduct, NormalizedProductsDocument } from "./types.js";

function createProduct(
  fdcId: number,
  overrides: Partial<NormalizedProduct> = {},
): NormalizedProduct {
  return {
    fdcId,
    dataset: "FOUNDATION_FOOD",
    dataType: "foundation_food",
    originalDescription: "Apple, raw",
    normalizedNameEn: "Apple",
    preparationMethod: "RAW",
    foodState: "RAW",
    preparationConfidence: "HIGH",
    modifiersEn: [],
    unclassifiedParts: [],
    foodCategoryExternalId: "9", // Fruits and Fruit Juices
    publicationDate: "2024-10-31",
    ndbNumber: "09003",
    ...overrides,
  };
}

function createNormalizedDocument(): NormalizedProductsDocument {
  return {
    schemaVersion: 1,
    sourceSchemaVersion: 1,
    statistics: {
      inputFoodsTotal: 2,
      normalizedFoodsTotal: 2,
      rawFoods: 1,
      cookedFoods: 1,
      processedFoods: 0,
      readyToEatFoods: 0,
      unspecifiedFoods: 0,
      foodsWithModifiers: 0,
      foodsWithUnclassifiedParts: 0,
    },
    products: [
      createProduct(100),

      createProduct(200, {
        originalDescription: "Chicken casserole",
        normalizedNameEn: "Chicken casserole",
        preparationMethod: "UNSPECIFIED",
        foodState: "COOKED",
        preparationConfidence: "MEDIUM",
        foodCategoryExternalId: "5", // Poultry Products
      }),
    ],
  };
}

test("non-strict mode includes only approved products", () => {
  const review = buildCatalogReview(createNormalizedDocument(), {});

  const curated = buildCuratedCatalog(review, {
    strict: false,
  });

  assert.equal(curated.statistics.reviewItemsTotal, 2);

  assert.equal(curated.statistics.includedProductsTotal, 1);

  assert.equal(curated.statistics.excludedProductsTotal, 0);

  assert.equal(curated.statistics.unresolvedProductsTotal, 1);

  assert.deepEqual(
    curated.products.map((product) => product.fdcId),
    [100],
  );
});

test("strict mode rejects unresolved products", () => {
  const review = buildCatalogReview(createNormalizedDocument(), {});

  assert.throws(
    () =>
      buildCuratedCatalog(review, {
        strict: true,
      }),
    /unresolved products/,
  );
});

test("strict mode succeeds after manual resolution", () => {
  const overrides: Readonly<Record<number, CurationOverride>> = {
    200: {
      decision: "EXCLUDE",
      note: "Composite dish.",
    },
  };

  const review = buildCatalogReview(createNormalizedDocument(), overrides);

  const curated = buildCuratedCatalog(review, {
    strict: true,
  });

  assert.equal(curated.statistics.reviewItemsTotal, 2);

  assert.equal(curated.statistics.unresolvedProductsTotal, 0);

  assert.equal(curated.statistics.includedProductsTotal, 1);

  assert.equal(curated.statistics.excludedProductsTotal, 1);

  assert.deepEqual(
    curated.products.map((product) => product.fdcId),
    [100],
  );
});

test("manual include adds a reviewed product to the curated catalog", () => {
  const overrides: Readonly<Record<number, CurationOverride>> = {
    200: {
      decision: "INCLUDE",
      note: "Reviewed and accepted.",
    },
  };

  const review = buildCatalogReview(createNormalizedDocument(), overrides);

  const curated = buildCuratedCatalog(review, {
    strict: true,
  });

  assert.equal(curated.statistics.unresolvedProductsTotal, 0);

  assert.equal(curated.statistics.includedProductsTotal, 2);

  assert.equal(curated.statistics.excludedProductsTotal, 0);

  assert.deepEqual(
    curated.products.map((product) => product.fdcId).sort((left, right) => left - right),
    [100, 200],
  );

  const chicken = curated.products.find((product) => product.fdcId === 200);

  assert.ok(chicken);

  assert.equal(chicken.curation.decisionSource, "OVERRIDE");

  assert.equal(chicken.curation.overrideNote, "Reviewed and accepted.");

  assert.ok(chicken.curation.reasonCodes.includes("MANUAL_INCLUDE"));
});
