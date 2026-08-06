import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFoods } from "./normalize-foods.js";
import type { SelectedFoodsDocument } from "./types.js";

function createSelectedFoodsDocument(): SelectedFoodsDocument {
  return {
    schemaVersion: 1,
    datasets: ["FOUNDATION_FOOD", "SR_LEGACY"],
    statistics: {
      foodRowsRead: 4,
      foundationReferencesRead: 2,
      srLegacyReferencesRead: 2,
      selectedFoundationFoods: 2,
      selectedSrLegacyFoods: 2,
      selectedFoodsTotal: 4,
    },
    foods: [
      {
        fdcId: 400,
        dataset: "SR_LEGACY",
        dataType: "sr_legacy_food",
        description: "Rice, white, cooked",
        foodCategoryExternalId: "Cereal Grains and Pasta",
        publicationDate: "2019-04-01",
        ndbNumber: "20444",
      },
      {
        fdcId: 100,
        dataset: "FOUNDATION_FOOD",
        dataType: "foundation_food",
        description: "Apple, raw",
        foodCategoryExternalId: "Fruits and Fruit Juices",
        publicationDate: "2024-10-31",
        ndbNumber: "09003",
      },
      {
        fdcId: 300,
        dataset: "SR_LEGACY",
        dataType: "sr_legacy_food",
        description: "Beans, kidney, red, cooked, boiled, without salt",
        foodCategoryExternalId: "Legumes and Legume Products",
        publicationDate: "2019-04-01",
        ndbNumber: "16028",
      },
      {
        fdcId: 200,
        dataset: "FOUNDATION_FOOD",
        dataType: "foundation_food",
        description: "Soup, prepared with water",
        foodCategoryExternalId: "Soups, Sauces, and Gravies",
        publicationDate: "2024-10-31",
        ndbNumber: null,
      },
    ],
  };
}

test("normalizeFoods creates deterministic normalized products", () => {
  const result = normalizeFoods(createSelectedFoodsDocument());

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.sourceSchemaVersion, 1);

  assert.deepEqual(result.statistics, {
    inputFoodsTotal: 4,
    normalizedFoodsTotal: 4,

    rawFoods: 1,
    cookedFoods: 2,
    processedFoods: 0,
    readyToEatFoods: 0,
    unspecifiedFoods: 1,

    foodsWithModifiers: 1,
    foodsWithUnclassifiedParts: 1,
  });

  assert.deepEqual(
    result.products.map((product) => product.fdcId),
    [100, 300, 400, 200],
  );
});

test("normalizeFoods preserves source metadata", () => {
  const result = normalizeFoods(createSelectedFoodsDocument());

  const apple = result.products.find((product) => product.fdcId === 100);

  assert.deepEqual(apple, {
    fdcId: 100,
    dataset: "FOUNDATION_FOOD",
    dataType: "foundation_food",

    originalDescription: "Apple, raw",
    normalizedNameEn: "Apple",

    preparationMethod: "RAW",
    foodState: "RAW",
    preparationConfidence: "HIGH",

    modifiersEn: [],
    unclassifiedParts: [],

    foodCategoryExternalId: "Fruits and Fruit Juices",
    publicationDate: "2024-10-31",
    ndbNumber: "09003",
  });
});

test("normalizeFoods rejects duplicate FDC IDs", () => {
  const document = createSelectedFoodsDocument();

  const duplicateDocument: SelectedFoodsDocument = {
    ...document,
    foods: [
      ...document.foods,
      {
        ...document.foods[0],
      },
    ],
  };

  assert.throws(() => normalizeFoods(duplicateDocument), /Duplicate FDC ID 400/);
});

test("normalizeFoods rejects an unsupported source schema", () => {
  const invalidDocument = {
    ...createSelectedFoodsDocument(),
    schemaVersion: 2,
  } as unknown as SelectedFoodsDocument;

  assert.throws(() => normalizeFoods(invalidDocument), /Unsupported selected-foods schema version/);
});
