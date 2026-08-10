import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogReview } from "./build-catalog-review.js";
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

function createDocument(): NormalizedProductsDocument {
  return {
    schemaVersion: 1,
    sourceSchemaVersion: 1,
    statistics: {
      inputFoodsTotal: 3,
      normalizedFoodsTotal: 3,
      rawFoods: 1,
      cookedFoods: 1,
      processedFoods: 0,
      readyToEatFoods: 0,
      unspecifiedFoods: 1,
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

      createProduct(300, {
        originalDescription: "Baby food, fruit, apple",
        normalizedNameEn: "Baby food, fruit, apple",
        preparationMethod: "UNSPECIFIED",
        foodState: "UNSPECIFIED",
        preparationConfidence: "LOW",
        foodCategoryExternalId: "3", // Baby Foods
      }),
    ],
  };
}

test("buildCatalogReview generates automatic decisions", () => {
  const review = buildCatalogReview(createDocument(), {});

  assert.deepEqual(review.statistics, {
    inputProductsTotal: 3,
    automaticIncludes: 1,
    automaticExcludes: 1,
    automaticNeedsReview: 1,
    finalIncludes: 1,
    finalExcludes: 1,
    finalNeedsReview: 1,
    overriddenProducts: 0,
  });
});

test("manual override replaces the final decision", () => {
  const overrides: Readonly<Record<number, CurationOverride>> = {
    200: {
      decision: "INCLUDE",
      note: "Reviewed and accepted as a useful generic item.",
    },
  };

  const review = buildCatalogReview(createDocument(), overrides);

  const item = review.items.find((candidate) => candidate.fdcId === 200);

  assert.ok(item);

  assert.equal(item.automaticDecision, "NEEDS_REVIEW");

  assert.equal(item.finalDecision, "INCLUDE");

  assert.equal(item.decisionSource, "OVERRIDE");

  assert.ok(item.reasonCodes.includes("MANUAL_INCLUDE"));

  assert.equal(item.overrideNote, "Reviewed and accepted as a useful generic item.");
});

test("rejects an override for an unknown FDC ID", () => {
  assert.throws(
    () =>
      buildCatalogReview(createDocument(), {
        999: {
          decision: "INCLUDE",
          note: "Unknown product.",
        },
      }),
    /overrides reference unknown FDC IDs/,
  );
});

test("review output is deterministic", () => {
  const first = buildCatalogReview(createDocument(), {});

  const second = buildCatalogReview(createDocument(), {});

  assert.deepEqual(first, second);
});
