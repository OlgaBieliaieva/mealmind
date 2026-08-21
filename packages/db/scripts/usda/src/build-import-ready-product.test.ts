import assert from "node:assert/strict";
import test from "node:test";

import { getMeasurementUnitReference } from "../config/measurement-unit-reference.js";

import { buildImportReadyProduct } from "./build-import-ready-product.js";

import type {
  ProductWithNormalizedPortions,
  NormalizedProductPortion,
} from "./portion-normalization-types.js";

function createPortion(
  overrides: Partial<NormalizedProductPortion> = {},
): NormalizedProductPortion {
  return {
    sourceRowId: "portion-1",

    sourceSequence: 1,

    amount: 1,

    gramWeight: 100,

    labelEn: "slice",

    kind: "COUNT",

    weightType: "UNKNOWN",

    measurementUnitCode: null,

    sourceMeasurementUnitExternalId: "9999",

    sourceMeasurementUnitName: "undetermined",

    sourceModifier: "slice",

    sourcePortionDescription: null,

    sourceDataPoints: null,

    reasonCodes: ["NORMALIZED_COUNT_PORTION"],

    ...overrides,
  };
}

function createProduct(
  overrides: Partial<ProductWithNormalizedPortions> = {},
): ProductWithNormalizedPortions {
  return {
    fdcId: 100,

    dataset: "FOUNDATION_FOOD",

    dataType: "foundation_food",

    originalDescription: "Apples, raw",

    normalizedNameEn: "Apples",

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

        valuePer100g: 0.3,

        valueType: "UNKNOWN",

        sourceRowId: "nutrient-row-1",

        sourceDerivationExternalId: "49",

        sourceDataPoints: 10,
      },
    ],

    portions: [createPortion()],

    ...overrides,
  } as ProductWithNormalizedPortions;
}

test("builds an import-ready product", () => {
  const result = buildImportReadyProduct(createProduct());

  assert.equal(result.fdcId, 100);

  assert.equal(result.nameEn, "Apples");

  assert.equal(result.nameUa, null);

  assert.equal(result.categoryCode, "apples_pears");

  assert.equal(result.defaultMeasurementUnitCode, "g");

  assert.equal(result.defaultMeasurementUnitId, getMeasurementUnitReference("g").id);

  assert.equal(result.source.provider, "USDA");
});

test("maps nutrient values and provenance", () => {
  const result = buildImportReadyProduct(createProduct());

  assert.deepEqual(result.nutrients, [
    {
      nutrientId: "nutrient-protein",

      nutrientCode: "protein",

      valuePer100g: 0.3,

      valueType: "UNKNOWN",

      source: {
        usdaNutrientId: 1003,

        rowId: "nutrient-row-1",

        derivationExternalId: "49",

        dataPoints: 10,
      },
    },
  ]);
});

test("keeps count portions without a global measurement unit", () => {
  const result = buildImportReadyProduct(
    createProduct({
      portions: [
        createPortion({
          labelEn: "slice",

          kind: "COUNT",

          measurementUnitCode: null,

          amount: 1,

          gramWeight: 138,
        }),
      ],
    }),
  );

  const portion = result.portions[0];

  assert.ok(portion);

  assert.equal(portion.kind, "COUNT");

  assert.equal(portion.amount, 1);

  assert.equal(portion.gramWeight, 138);

  assert.equal(portion.measurementUnitId, null);

  assert.equal(portion.measurementUnitCode, null);
});

test("converts a cup portion to milliliters", () => {
  const result = buildImportReadyProduct(
    createProduct({
      portions: [
        createPortion({
          labelEn: "cup",

          kind: "VOLUME",

          measurementUnitCode: "cup",

          amount: 1,

          gramWeight: 240,
        }),
      ],
    }),
  );

  const portion = result.portions[0];

  assert.ok(portion);

  assert.equal(portion.kind, "VOLUME");

  assert.equal(portion.measurementUnitCode, "ml");

  assert.equal(portion.measurementUnitId, getMeasurementUnitReference("ml").id);

  assert.ok(portion.amount > 200);
});

test("preserves already metric milliliter portions", () => {
  const result = buildImportReadyProduct(
    createProduct({
      portions: [
        createPortion({
          labelEn: "ml",

          kind: "VOLUME",

          measurementUnitCode: "ml",

          amount: 100,

          gramWeight: 100,
        }),
      ],
    }),
  );

  const portion = result.portions[0];

  assert.ok(portion);

  assert.equal(portion.amount, 100);

  assert.equal(portion.measurementUnitCode, "ml");
});

test("preserves liters when the source portion is already liters", () => {
  const result = buildImportReadyProduct(
    createProduct({
      portions: [
        createPortion({
          labelEn: "l",

          kind: "VOLUME",

          measurementUnitCode: "l",

          amount: 1,

          gramWeight: 1000,
        }),
      ],
    }),
  );

  const portion = result.portions[0];

  assert.ok(portion);

  assert.equal(portion.amount, 1);

  assert.equal(portion.measurementUnitCode, "l");

  assert.equal(portion.measurementUnitId, getMeasurementUnitReference("l").id);
});

test("preserves portion provenance", () => {
  const result = buildImportReadyProduct(
    createProduct({
      portions: [
        createPortion({
          sourceRowId: "123",

          sourceSequence: 5,

          sourceMeasurementUnitExternalId: "9999",

          sourceMeasurementUnitName: "undetermined",

          sourceModifier: "slice",

          sourcePortionDescription: "1 slice",

          sourceDataPoints: 7,
        }),
      ],
    }),
  );

  assert.deepEqual(result.portions[0]?.source, {
    rowId: "123",

    sequence: 5,

    measurementUnitExternalId: "9999",

    measurementUnitName: "undetermined",

    modifier: "slice",

    portionDescription: "1 slice",

    dataPoints: 7,
  });
});

test("preserves product normalization metadata", () => {
  const result = buildImportReadyProduct(
    createProduct({
      preparationMethod: "RAW",

      foodState: "RAW",

      modifiersEn: ["without salt"],

      unclassifiedParts: ["unknown qualifier"],
    }),
  );

  assert.equal(result.preparationMethod, "RAW");

  assert.equal(result.foodState, "RAW");

  assert.deepEqual(result.modifiersEn, ["without salt"]);

  assert.deepEqual(result.modifiersUa, []);

  assert.deepEqual(result.unclassifiedParts, ["unknown qualifier"]);
});

test("rejects an unexpected MASS portion", () => {
  assert.throws(
    () =>
      buildImportReadyProduct(
        createProduct({
          portions: [
            createPortion({
              kind: "MASS",

              labelEn: "gram",

              measurementUnitCode: null,
            }),
          ],
        }),
      ),
    /Unexpected normalized MASS portion/,
  );
});

test("rejects an unexpected OTHER portion", () => {
  assert.throws(
    () =>
      buildImportReadyProduct(
        createProduct({
          portions: [
            createPortion({
              kind: "OTHER",

              labelEn: "unknown",

              measurementUnitCode: null,
            }),
          ],
        }),
      ),
    /Unexpected normalized OTHER portion/,
  );
});

test("import-ready product building is deterministic", () => {
  const product = createProduct();

  const first = buildImportReadyProduct(product);

  const second = buildImportReadyProduct(product);

  assert.deepEqual(first, second);
});
