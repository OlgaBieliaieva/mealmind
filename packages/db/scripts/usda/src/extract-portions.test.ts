import assert from "node:assert/strict";
import test from "node:test";

import { extractPortions } from "./extract-portions.js";

import type {
  ExtractedNutrientsDocument,
  ProductWithExtractedNutrients,
} from "./nutrient-types.js";

import type { UsdaMeasureUnit } from "./portion-types.js";

import type { UsdaFoodPortionRow } from "./portion-source.js";

function createNutrientReadyProduct(fdcId: number): ProductWithExtractedNutrients {
  return {
    fdcId,

    dataset: "FOUNDATION_FOOD",

    dataType: "foundation_food",

    originalDescription: `Product ${fdcId}`,

    normalizedNameEn: `Product ${fdcId}`,

    preparationMethod: "UNSPECIFIED",

    foodState: "UNSPECIFIED",

    preparationConfidence: "LOW",

    modifiersEn: [],

    unclassifiedParts: [],

    foodCategoryExternalId: "9",

    publicationDate: "2024-10-31",

    ndbNumber: null,

    curation: {
      automaticDecision: "INCLUDE",

      finalDecision: "INCLUDE",

      decisionSource: "AUTOMATIC",

      reasonCodes: ["CATEGORY_INCLUDED"],

      overrideNote: null,
    },

    nutrients: [
      {
        nutrientId: "energy-id",

        nutrientCode: "energy_kcal",

        usdaNutrientId: 1008,

        valuePer100g: 100,

        valueType: "UNKNOWN",

        sourceRowId: "energy-row",

        sourceDerivationExternalId: null,

        sourceDataPoints: null,
      },
    ],
  } as ProductWithExtractedNutrients;
}

function createNutrientReadyDocument(
  products: readonly ProductWithExtractedNutrients[],
): ExtractedNutrientsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: products.length,

      outputProductsTotal: products.length,

      productsWithNutrients: products.length,

      productsWithoutNutrients: 0,

      productsExcludedForMissingEnergy: 0,

      extractedNutrientValues: products.length,

      ignoredNutrientRows: 0,

      whitelistNutrients: 36,

      representedWhitelistNutrients: products.length > 0 ? 1 : 0,

      energySource1008Products: products.length,

      energySource2048Products: 0,

      energySource2047Products: 0,
    },

    products,
  };
}

function createPortionRow(overrides: Partial<UsdaFoodPortionRow> = {}): UsdaFoodPortionRow {
  return {
    id: "1",

    fdcId: 100,

    sequenceNumber: 1,

    amount: 1,

    measureUnitId: "1000",

    portionDescription: "1 cup",

    modifier: "cup",

    gramWeight: 142,

    dataPoints: null,

    minYearAcquired: null,

    ...overrides,
  };
}

function createMeasureUnits(): ReadonlyMap<string, UsdaMeasureUnit> {
  return new Map([
    [
      "1000",
      {
        externalId: "1000",

        name: "cup",
      },
    ],

    [
      "1001",
      {
        externalId: "1001",

        name: "tablespoon",
      },
    ],

    [
      "9999",
      {
        externalId: "9999",

        name: "undetermined",
      },
    ],
  ]);
}

test("extracts portions for a nutrient-ready product", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [createPortionRow()],

    measureUnits: createMeasureUnits(),
  });

  assert.equal(result.products.length, 1);

  assert.equal(result.products[0]?.portions.length, 1);

  const portion = result.products[0]?.portions[0];

  assert.ok(portion);

  assert.equal(portion.sourceAmount, 1);

  assert.equal(portion.gramWeight, 142);

  assert.equal(portion.sourceMeasurementUnitName, "cup");
});

test("preserves raw USDA portion metadata", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        id: "98765",

        sequenceNumber: 3,

        amount: 0.5,

        measureUnitId: "1001",

        portionDescription: "1/2 tablespoon",

        modifier: "tablespoon",

        gramWeight: 7.1,

        dataPoints: 8,

        minYearAcquired: 2019,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  const portion = result.products[0]?.portions[0];

  assert.ok(portion);

  assert.equal(portion.sourceRowId, "98765");

  assert.equal(portion.sourceSequence, 3);

  assert.equal(portion.sourceAmount, 0.5);

  assert.equal(portion.gramWeight, 7.1);

  assert.equal(portion.sourceMeasurementUnitExternalId, "1001");

  assert.equal(portion.sourceMeasurementUnitName, "tablespoon");

  assert.equal(portion.portionDescription, "1/2 tablespoon");

  assert.equal(portion.modifier, "tablespoon");

  assert.equal(portion.sourceDataPoints, 8);

  assert.equal(portion.sourceMinYearAcquired, 2019);
});

test("resolves USDA unit 9999 as undetermined", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        amount: 0,

        measureUnitId: "9999",

        modifier: "cup",
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  const portion = result.products[0]?.portions[0];

  assert.ok(portion);

  assert.equal(portion.sourceMeasurementUnitExternalId, "9999");

  assert.equal(portion.sourceMeasurementUnitName, "undetermined");

  assert.equal(result.statistics.undeterminedUnitPortions, 1);
});

test("preserves a zero USDA portion amount", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        amount: 0,

        measureUnitId: "9999",

        gramWeight: 142,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.equal(result.products[0]?.portions[0]?.sourceAmount, 0);

  assert.equal(result.statistics.zeroAmountPortions, 1);
});

test("keeps a product without USDA portions in the output", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [],

    measureUnits: createMeasureUnits(),
  });

  assert.equal(result.products.length, 1);

  assert.deepEqual(result.products[0]?.portions, []);

  assert.equal(result.statistics.productsWithPortions, 0);

  assert.equal(result.statistics.productsWithoutPortions, 1);
});

test("does not include portion rows for products outside the nutrient-ready catalog", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        fdcId: 999,
      }),

      createPortionRow({
        id: "valid",
        fdcId: 100,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.equal(result.products.length, 1);

  assert.equal(result.products[0]?.portions.length, 1);

  assert.equal(result.products[0]?.portions[0]?.sourceRowId, "valid");
});

test("preserves a missing measure unit", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        measureUnitId: null,

        portionDescription: "1 medium",

        modifier: "medium",
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  const portion = result.products[0]?.portions[0];

  assert.ok(portion);

  assert.equal(portion.sourceMeasurementUnitExternalId, null);

  assert.equal(portion.sourceMeasurementUnitName, null);

  assert.equal(result.statistics.missingUnitPortions, 1);
});

test("preserves an unknown USDA measure unit without inventing a mapping", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        measureUnitId: "5555",
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  const portion = result.products[0]?.portions[0];

  assert.ok(portion);

  assert.equal(portion.sourceMeasurementUnitExternalId, "5555");

  assert.equal(portion.sourceMeasurementUnitName, null);
});

test("sorts portions deterministically by source sequence", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        id: "third",
        sequenceNumber: 3,
      }),

      createPortionRow({
        id: "first",
        sequenceNumber: 1,
      }),

      createPortionRow({
        id: "second",
        sequenceNumber: 2,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.sourceRowId),
    ["first", "second", "third"],
  );
});

test("places portions without source sequence after sequenced portions", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        id: "without-sequence",

        sequenceNumber: null,
      }),

      createPortionRow({
        id: "with-sequence",

        sequenceNumber: 1,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.sourceRowId),
    ["with-sequence", "without-sequence"],
  );
});

test("uses source row ID as deterministic tie breaker", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([createNutrientReadyProduct(100)]),

    portionRows: [
      createPortionRow({
        id: "b",
        sequenceNumber: 1,
      }),

      createPortionRow({
        id: "a",
        sequenceNumber: 1,
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.sourceRowId),
    ["a", "b"],
  );
});

test("sorts output products deterministically by FDC ID", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([
      createNutrientReadyProduct(300),

      createNutrientReadyProduct(100),

      createNutrientReadyProduct(200),
    ]),

    portionRows: [],

    measureUnits: createMeasureUnits(),
  });

  assert.deepEqual(
    result.products.map((product) => product.fdcId),
    [100, 200, 300],
  );
});

test("preserves nutrient-ready product metadata", () => {
  const product = createNutrientReadyProduct(100);

  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([product]),

    portionRows: [createPortionRow()],

    measureUnits: createMeasureUnits(),
  });

  const output = result.products[0];

  assert.ok(output);

  assert.equal(output.fdcId, product.fdcId);

  assert.equal(output.normalizedNameEn, product.normalizedNameEn);

  assert.deepEqual(output.nutrients, product.nutrients);

  assert.deepEqual(output.curation, product.curation);
});

test("calculates portion extraction statistics", () => {
  const result = extractPortions({
    nutrientReady: createNutrientReadyDocument([
      createNutrientReadyProduct(100),

      createNutrientReadyProduct(200),

      createNutrientReadyProduct(300),
    ]),

    portionRows: [
      createPortionRow({
        id: "1",

        fdcId: 100,

        sequenceNumber: 1,

        amount: 1,

        measureUnitId: "1000",
      }),

      createPortionRow({
        id: "2",

        fdcId: 100,

        sequenceNumber: 2,

        amount: 0,

        measureUnitId: "9999",
      }),

      createPortionRow({
        id: "3",

        fdcId: 200,

        sequenceNumber: 1,

        amount: 1,

        measureUnitId: null,
      }),

      createPortionRow({
        id: "external",

        fdcId: 999,

        sequenceNumber: 1,

        amount: 1,

        measureUnitId: "1001",
      }),
    ],

    measureUnits: createMeasureUnits(),
  });

  assert.deepEqual(result.statistics, {
    inputProductsTotal: 3,

    productsWithPortions: 2,

    productsWithoutPortions: 1,

    selectedPortionRows: 4,

    extractedPortions: 3,

    zeroAmountPortions: 1,

    undeterminedUnitPortions: 1,

    missingUnitPortions: 1,

    distinctSourceMeasurementUnits: 2,
  });
});

test("portion extraction is deterministic", () => {
  const nutrientReady = createNutrientReadyDocument([
    createNutrientReadyProduct(200),

    createNutrientReadyProduct(100),
  ]);

  const portionRows = [
    createPortionRow({
      id: "3",

      fdcId: 100,

      sequenceNumber: 2,
    }),

    createPortionRow({
      id: "1",

      fdcId: 200,

      sequenceNumber: 1,
    }),

    createPortionRow({
      id: "2",

      fdcId: 100,

      sequenceNumber: 1,
    }),
  ];

  const measureUnits = createMeasureUnits();

  const first = extractPortions({
    nutrientReady,
    portionRows,
    measureUnits,
  });

  const second = extractPortions({
    nutrientReady,
    portionRows,
    measureUnits,
  });

  assert.deepEqual(first, second);
});
