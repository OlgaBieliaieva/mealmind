import assert from "node:assert/strict";
import test from "node:test";

import { USDA_NUTRIENT_BY_ID, USDA_NUTRIENT_WHITELIST } from "../config/nutrient-whitelist.js";

import { extractNutrients } from "./extract-nutrients.js";

import type { SelectedFoodNutrientRow } from "./extract-nutrients.js";

import type { CuratedProduct, CuratedProductsDocument } from "./types.js";

function createProduct(fdcId: number): CuratedProduct {
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
  } as CuratedProduct;
}

function createCuratedDocument(products: readonly CuratedProduct[]): CuratedProductsDocument {
  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      reviewItemsTotal: products.length,

      includedProductsTotal: products.length,

      excludedProductsTotal: 0,

      unresolvedProductsTotal: 0,
    },

    products,
  } as CuratedProductsDocument;
}

function createNutrientRow(
  overrides: Partial<SelectedFoodNutrientRow> = {},
): SelectedFoodNutrientRow {
  return {
    id: "1",

    fdcId: 100,

    nutrientId: 1003,

    amount: 10,

    dataPoints: null,

    derivationId: null,

    ...overrides,
  };
}

function createEnergyRow(
  fdcId = 100,
  amount = 100,
  id = `energy-${fdcId}`,
): SelectedFoodNutrientRow {
  return createNutrientRow({
    id,
    fdcId,
    nutrientId: 1008,
    amount,
  });
}

test("extracts a whitelisted nutrient for a curated product", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "protein",
        nutrientId: 1003,
        amount: 12.5,
      }),
    ],
  });

  assert.equal(result.products.length, 1);

  assert.equal(result.products[0]?.nutrients.length, 2);

  const protein = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "protein",
  );

  assert.ok(protein);

  assert.equal(protein.usdaNutrientId, 1003);

  assert.equal(protein.valuePer100g, 12.5);
});

test("maps USDA nutrient ID to the canonical MealMind nutrient ID", () => {
  const mapping = USDA_NUTRIENT_BY_ID.get(1003);

  assert.ok(mapping);

  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "protein",
        nutrientId: 1003,
      }),
    ],
  });

  const nutrient = result.products[0]?.nutrients.find((item) => item.nutrientCode === "protein");

  assert.ok(nutrient);

  assert.equal(nutrient.nutrientId, mapping.nutrientId);
});

test("preserves USDA nutrient provenance metadata", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "98765",
        nutrientId: 1003,
        amount: 15,
        dataPoints: 7,
        derivationId: "49",
      }),
    ],
  });

  const nutrient = result.products[0]?.nutrients.find((item) => item.nutrientCode === "protein");

  assert.ok(nutrient);

  assert.equal(nutrient.sourceRowId, "98765");

  assert.equal(nutrient.sourceDataPoints, 7);

  assert.equal(nutrient.sourceDerivationExternalId, "49");
});

test("uses UNKNOWN value type until USDA derivation mapping is implemented", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "protein",
        nutrientId: 1003,
        derivationId: "49",
      }),
    ],
  });

  const protein = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "protein",
  );

  assert.equal(protein?.valueType, "UNKNOWN");
});

test("ignores nutrient rows for products outside the curated catalog", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "external",
        fdcId: 999,
        nutrientId: 1003,
      }),
    ],
  });

  assert.equal(result.products.length, 1);

  assert.equal(result.products[0]?.nutrients.length, 1);

  assert.equal(result.statistics.ignoredNutrientRows, 1);
});

test("ignores USDA nutrients outside the MealMind whitelist", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "unsupported",
        nutrientId: 9999,
      }),
    ],
  });

  assert.equal(result.products.length, 1);

  assert.equal(result.products[0]?.nutrients.length, 1);

  assert.equal(result.statistics.ignoredNutrientRows, 1);
});

test("preserves an explicit zero nutrient value", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "protein",
        nutrientId: 1003,
        amount: 0,
      }),
    ],
  });

  const protein = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "protein",
  );

  assert.equal(protein?.valuePer100g, 0);
});

test("does not invent missing non-energy nutrient values", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [createEnergyRow()],
  });

  assert.equal(result.products.length, 1);

  assert.deepEqual(
    result.products[0]?.nutrients.map((nutrient) => nutrient.nutrientCode),
    ["energy_kcal"],
  );

  assert.equal(result.statistics.productsWithoutNutrients, 0);
});

test("deduplicates identical nutrient rows for the same product", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "1",
        nutrientId: 1003,
        amount: 10,
        dataPoints: null,
        derivationId: "49",
      }),

      createNutrientRow({
        id: "2",
        nutrientId: 1003,
        amount: 10,
        dataPoints: null,
        derivationId: "49",
      }),
    ],
  });

  const proteins = result.products[0]?.nutrients.filter(
    (nutrient) => nutrient.nutrientCode === "protein",
  );

  assert.equal(proteins?.length, 1);

  assert.equal(proteins?.[0]?.valuePer100g, 10);
});

test("rejects conflicting nutrient rows for the same product", () => {
  assert.throws(
    () =>
      extractNutrients({
        curated: createCuratedDocument([createProduct(100)]),

        foodNutrientRows: [
          createEnergyRow(),

          createNutrientRow({
            id: "1",
            nutrientId: 1003,
            amount: 10,
            derivationId: "49",
          }),

          createNutrientRow({
            id: "2",
            nutrientId: 1003,
            amount: 11,
            derivationId: "49",
          }),
        ],
      }),
    /Conflicting USDA nutrient values for FDC 100, nutrient 1003/,
  );
});

test("rejects duplicate nutrient rows with different provenance", () => {
  assert.throws(
    () =>
      extractNutrients({
        curated: createCuratedDocument([createProduct(100)]),

        foodNutrientRows: [
          createEnergyRow(),

          createNutrientRow({
            id: "1",
            nutrientId: 1003,
            amount: 10,
            derivationId: "49",
          }),

          createNutrientRow({
            id: "2",
            nutrientId: 1003,
            amount: 10,
            derivationId: "50",
          }),
        ],
      }),
    /Conflicting USDA nutrient values/,
  );
});

test("allows different nutrients for the same product", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "1",
        nutrientId: 1003,
        amount: 10,
      }),

      createNutrientRow({
        id: "2",
        nutrientId: 1004,
        amount: 5,
      }),

      createEnergyRow(100, 100, "3"),
    ],
  });

  assert.equal(result.products[0]?.nutrients.length, 3);
});

test("allows the same nutrient for different products", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100), createProduct(200)]),

    foodNutrientRows: [
      createEnergyRow(100, 100, "energy-100"),

      createEnergyRow(200, 200, "energy-200"),

      createNutrientRow({
        id: "protein-100",
        fdcId: 100,
        nutrientId: 1003,
        amount: 10,
      }),

      createNutrientRow({
        id: "protein-200",
        fdcId: 200,
        nutrientId: 1003,
        amount: 20,
      }),
    ],
  });

  assert.equal(result.products.length, 2);

  assert.equal(
    result.products[0]?.nutrients.filter((nutrient) => nutrient.nutrientCode === "protein").length,
    1,
  );

  assert.equal(
    result.products[1]?.nutrients.filter((nutrient) => nutrient.nutrientCode === "protein").length,
    1,
  );
});

test("sorts extracted nutrients deterministically by USDA nutrient ID", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "1",
        nutrientId: 1008,
        amount: 100,
      }),

      createNutrientRow({
        id: "2",
        nutrientId: 1004,
      }),

      createNutrientRow({
        id: "3",
        nutrientId: 1003,
      }),
    ],
  });

  assert.deepEqual(
    result.products[0]?.nutrients.map((nutrient) => nutrient.usdaNutrientId),
    [1003, 1004, 1008],
  );
});

test("sorts products deterministically by FDC ID", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(300), createProduct(100), createProduct(200)]),

    foodNutrientRows: [
      createEnergyRow(300, 300, "energy-300"),

      createEnergyRow(100, 100, "energy-100"),

      createEnergyRow(200, 200, "energy-200"),
    ],
  });

  assert.deepEqual(
    result.products.map((product) => product.fdcId),
    [100, 200, 300],
  );
});

test("calculates nutrient extraction statistics", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100), createProduct(200), createProduct(300)]),

    foodNutrientRows: [
      createEnergyRow(100, 100, "energy-100"),

      createNutrientRow({
        id: "protein-100",
        fdcId: 100,
        nutrientId: 1003,
      }),

      createNutrientRow({
        id: "fat-100",
        fdcId: 100,
        nutrientId: 1004,
      }),

      createNutrientRow({
        id: "energy-200",
        fdcId: 200,
        nutrientId: 2048,
        amount: 200,
      }),

      createNutrientRow({
        id: "protein-200",
        fdcId: 200,
        nutrientId: 1003,
      }),

      createNutrientRow({
        id: "external",
        fdcId: 999,
        nutrientId: 1003,
      }),

      createNutrientRow({
        id: "unsupported",
        fdcId: 200,
        nutrientId: 9999,
      }),
    ],
  });

  assert.deepEqual(result.statistics, {
    inputProductsTotal: 3,

    outputProductsTotal: 2,

    productsWithNutrients: 2,

    productsWithoutNutrients: 0,

    productsExcludedForMissingEnergy: 1,

    extractedNutrientValues: 5,

    ignoredNutrientRows: 2,

    whitelistNutrients: USDA_NUTRIENT_WHITELIST.length,

    representedWhitelistNutrients: 3,

    energySource1008Products: 1,

    energySource2048Products: 1,

    energySource2047Products: 0,
  });
});

test("preserves curated product metadata", () => {
  const product = createProduct(100);

  const result = extractNutrients({
    curated: createCuratedDocument([product]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "protein",
        nutrientId: 1003,
      }),
    ],
  });

  assert.equal(result.products[0]?.fdcId, product.fdcId);

  assert.equal(result.products[0]?.normalizedNameEn, product.normalizedNameEn);

  assert.deepEqual(result.products[0]?.curation, product.curation);
});

test("nutrient extraction is deterministic", () => {
  const curated = createCuratedDocument([createProduct(200), createProduct(100)]);

  const rows = [
    createEnergyRow(100, 100, "energy-100"),

    createNutrientRow({
      id: "protein-100",
      fdcId: 100,
      nutrientId: 1003,
      amount: 10,
    }),

    createEnergyRow(200, 200, "energy-200"),

    createNutrientRow({
      id: "fat-200",
      fdcId: 200,
      nutrientId: 1004,
      amount: 5,
    }),
  ];

  const first = extractNutrients({
    curated,
    foodNutrientRows: rows,
  });

  const second = extractNutrients({
    curated,
    foodNutrientRows: rows,
  });

  assert.deepEqual(first, second);
});

test("normalizes a negative USDA carbohydrate value to zero", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "carbohydrate",
        nutrientId: 1005,
        amount: -0.47505,
        derivationId: "49",
      }),
    ],
  });

  const carbohydrate = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "carbohydrate",
  );

  assert.ok(carbohydrate);

  assert.equal(carbohydrate.valuePer100g, 0);

  assert.equal(carbohydrate.sourceDerivationExternalId, "49");
});

test("rejects a negative value for a non-carbohydrate nutrient", () => {
  assert.throws(
    () =>
      extractNutrients({
        curated: createCuratedDocument([createProduct(100)]),

        foodNutrientRows: [
          createEnergyRow(),

          createNutrientRow({
            id: "protein",
            nutrientId: 1003,
            amount: -0.5,
          }),
        ],
      }),
    /Negative USDA nutrient value for nutrient 1003/,
  );
});

test("preserves a positive USDA carbohydrate value", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createEnergyRow(),

      createNutrientRow({
        id: "carbohydrate",
        nutrientId: 1005,
        amount: 12.75,
      }),
    ],
  });

  const carbohydrate = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "carbohydrate",
  );

  assert.equal(carbohydrate?.valuePer100g, 12.75);
});

test("prefers USDA Energy 1008 over Atwater energy sources", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "general",
        nutrientId: 2047,
        amount: 110,
      }),

      createNutrientRow({
        id: "specific",
        nutrientId: 2048,
        amount: 105,
      }),

      createNutrientRow({
        id: "energy",
        nutrientId: 1008,
        amount: 100,
      }),
    ],
  });

  const energy = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "energy_kcal",
  );

  assert.equal(energy?.valuePer100g, 100);

  assert.equal(energy?.usdaNutrientId, 1008);

  assert.equal(result.statistics.energySource1008Products, 1);
});

test("uses Atwater Specific energy when USDA Energy 1008 is missing", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "general",
        nutrientId: 2047,
        amount: 110,
      }),

      createNutrientRow({
        id: "specific",
        nutrientId: 2048,
        amount: 105,
      }),
    ],
  });

  const energy = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "energy_kcal",
  );

  assert.equal(energy?.valuePer100g, 105);

  assert.equal(energy?.usdaNutrientId, 2048);

  assert.equal(result.statistics.energySource2048Products, 1);
});

test("uses Atwater General energy when no higher-priority energy source exists", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "general",
        nutrientId: 2047,
        amount: 110,
      }),
    ],
  });

  const energy = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "energy_kcal",
  );

  assert.equal(energy?.valuePer100g, 110);

  assert.equal(energy?.usdaNutrientId, 2047);

  assert.equal(result.statistics.energySource2047Products, 1);
});

test("excludes a product with no supported energy source", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        nutrientId: 1003,
        amount: 10,
      }),
    ],
  });

  assert.equal(result.products.length, 0);

  assert.equal(result.statistics.outputProductsTotal, 0);

  assert.equal(result.statistics.productsExcludedForMissingEnergy, 1);
});

test("keeps a product with an explicit zero energy value", () => {
  const result = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        nutrientId: 2047,
        amount: 0,
      }),
    ],
  });

  assert.equal(result.products.length, 1);

  const energy = result.products[0]?.nutrients.find(
    (nutrient) => nutrient.nutrientCode === "energy_kcal",
  );

  assert.equal(energy?.valuePer100g, 0);
});

test("energy source priority is independent of row order", () => {
  const first = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "general",
        nutrientId: 2047,
        amount: 110,
      }),

      createNutrientRow({
        id: "energy",
        nutrientId: 1008,
        amount: 100,
      }),
    ],
  });

  const second = extractNutrients({
    curated: createCuratedDocument([createProduct(100)]),

    foodNutrientRows: [
      createNutrientRow({
        id: "energy",
        nutrientId: 1008,
        amount: 100,
      }),

      createNutrientRow({
        id: "general",
        nutrientId: 2047,
        amount: 110,
      }),
    ],
  });

  assert.deepEqual(first, second);
});
