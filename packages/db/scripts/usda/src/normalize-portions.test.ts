import assert from "node:assert/strict";
import test from "node:test";

import { normalizePortions } from "./normalize-portions.js";

import type {
  ExtractedPortion,
  ExtractedPortionsDocument,
  ProductWithExtractedPortions,
} from "./portion-types.js";

function createPortion(overrides: Partial<ExtractedPortion> = {}): ExtractedPortion {
  return {
    sourceRowId: "1",

    sourceSequence: 1,

    sourceAmount: 1,

    gramWeight: 100,

    sourceMeasurementUnitExternalId: "9999",

    sourceMeasurementUnitName: "undetermined",

    portionDescription: null,

    modifier: "cup",

    sourceDataPoints: null,

    sourceMinYearAcquired: null,

    ...overrides,
  };
}

function createProduct(
  fdcId: number,
  portions: readonly ExtractedPortion[],
): ProductWithExtractedPortions {
  return {
    fdcId,

    normalizedNameEn: `Product ${fdcId}`,

    originalDescription: `Product ${fdcId}`,

    portions,
  } as ProductWithExtractedPortions;
}

function createDocument(
  products: readonly ProductWithExtractedPortions[],
): ExtractedPortionsDocument {
  const extractedPortions = products.reduce((total, product) => total + product.portions.length, 0);

  return {
    schemaVersion: 1,

    sourceSchemaVersion: 1,

    statistics: {
      inputProductsTotal: products.length,

      productsWithPortions: products.filter((product) => product.portions.length > 0).length,

      productsWithoutPortions: products.filter((product) => product.portions.length === 0).length,

      selectedPortionRows: extractedPortions,

      extractedPortions,

      zeroAmountPortions: 0,

      undeterminedUnitPortions: 0,

      missingUnitPortions: 0,

      distinctSourceMeasurementUnits: 0,
    },

    products,
  };
}

test("keeps products without portions", () => {
  const result = normalizePortions({
    extracted: createDocument([createProduct(100, [])]),
  });

  assert.equal(result.products.length, 1);

  assert.deepEqual(result.products[0]?.portions, []);

  assert.equal(result.statistics.productsWithoutNormalizedPortions, 1);
});

test("normalizes valid product portions", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          modifier: "cup",
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "slice",

          gramWeight: 25,
        }),
      ]),
    ]),
  });

  assert.equal(result.products[0]?.portions.length, 2);

  assert.equal(result.statistics.normalizedPortionsTotal, 2);

  assert.equal(result.statistics.productsWithNormalizedPortions, 1);
});

test("removes semantic duplicates", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "cup",

          gramWeight: 100,
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "cup",

          gramWeight: 100,
        }),
      ]),
    ]),
  });

  assert.equal(result.products[0]?.portions.length, 1);

  assert.equal(result.statistics.semanticDuplicatesRemoved, 1);

  assert.equal(result.excludedPortions.length, 1);

  assert.deepEqual(result.excludedPortions[0]?.reasonCodes, ["SEMANTIC_DUPLICATE"]);
});

test("does not merge semantically different qualified portions", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "cup, chopped",

          gramWeight: 80,
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "cup, sliced",

          gramWeight: 80,
        }),
      ]),
    ]),
  });

  assert.equal(result.products[0]?.portions.length, 2);

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.labelEn),
    ["cup, chopped", "cup, sliced"],
  );
});

test("records excluded non-positive portions for audit", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceAmount: 0,

          modifier: "package",
        }),
      ]),
    ]),
  });

  assert.equal(result.products[0]?.portions.length, 0);

  assert.equal(result.excludedPortions.length, 1);

  assert.deepEqual(result.excludedPortions[0]?.reasonCodes, ["NON_POSITIVE_SOURCE_AMOUNT"]);

  assert.equal(result.statistics.excludedNonPositiveAmount, 1);
});

test("separately tracks localized policy exclusions", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "oz",
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "package (10 oz)",
        }),

        createPortion({
          sourceRowId: "3",

          modifier: "serving",
        }),
      ]),
    ]),
  });

  assert.equal(result.statistics.excludedNonLocalMeasure, 1);

  assert.equal(result.statistics.excludedPackageSpecificMeasure, 1);

  assert.equal(result.statistics.excludedServingSpecificMeasure, 1);

  assert.equal(result.products[0]?.portions.length, 0);

  assert.equal(result.excludedPortions.length, 3);
});

test("tracks unsupported measures separately", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          modifier: "custom unknown measure",
        }),
      ]),
    ]),
  });

  assert.equal(result.statistics.excludedUnsupportedMeasure, 1);

  assert.deepEqual(result.excludedPortions[0]?.reasonCodes, ["UNSUPPORTED_MEASURE"]);
});

test("tracks complex legacy measures separately", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          modifier: "piece, cooked, excluding refuse (yield from 1 lb raw meat with refuse)",
        }),
      ]),
    ]),
  });

  assert.equal(result.statistics.excludedComplexLegacyMeasure, 1);

  assert.deepEqual(result.excludedPortions[0]?.reasonCodes, ["COMPLEX_LEGACY_MEASURE"]);
});

test("keeps natural count portions after localization filtering", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "slice",

          gramWeight: 25,
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "stalk",

          gramWeight: 51,
        }),

        createPortion({
          sourceRowId: "3",

          modifier: "mushroom",

          gramWeight: 12,
        }),
      ]),
    ]),
  });

  assert.equal(result.products[0]?.portions.length, 3);

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.kind),
    ["COUNT", "COUNT", "COUNT"],
  );

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.measurementUnitCode),
    [null, null, null],
  );
});

test("keeps supported kitchen units", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "cup",
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "tbsp",
        }),

        createPortion({
          sourceRowId: "3",

          modifier: "tsp",
        }),
      ]),
    ]),
  });

  assert.deepEqual(
    result.products[0]?.portions.map((portion) => portion.measurementUnitCode),
    ["cup", "tbsp", "tsp"],
  );
});

test("calculates localized normalization statistics", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(100, [
        createPortion({
          sourceRowId: "1",

          modifier: "cup",
        }),

        createPortion({
          sourceRowId: "2",

          modifier: "oz",
        }),

        createPortion({
          sourceRowId: "3",

          modifier: "package",
        }),

        createPortion({
          sourceRowId: "4",

          modifier: "serving",
        }),

        createPortion({
          sourceRowId: "5",

          modifier: "unknown measure",
        }),

        createPortion({
          sourceRowId: "6",

          sourceAmount: 0,

          modifier: "cup",
        }),
      ]),

      createProduct(200, []),
    ]),
  });

  assert.deepEqual(result.statistics, {
    inputProductsTotal: 2,

    inputPortionsTotal: 6,

    outputProductsTotal: 2,

    productsWithNormalizedPortions: 1,

    productsWithoutNormalizedPortions: 1,

    normalizedPortionsTotal: 1,

    excludedPortionsTotal: 5,

    semanticDuplicatesRemoved: 0,

    excludedNonPositiveAmount: 1,

    excludedComplexLegacyMeasure: 0,

    excludedNonLocalMeasure: 1,

    excludedPackageSpecificMeasure: 1,

    excludedServingSpecificMeasure: 1,

    excludedUnsupportedMeasure: 1,

    excludedMissingMeasureLabel: 0,
  });
});

test("sorts output products deterministically", () => {
  const result = normalizePortions({
    extracted: createDocument([
      createProduct(300, []),

      createProduct(100, []),

      createProduct(200, []),
    ]),
  });

  assert.deepEqual(
    result.products.map((product) => product.fdcId),
    [100, 200, 300],
  );
});

test("portion normalization is deterministic", () => {
  const extracted = createDocument([
    createProduct(100, [
      createPortion({
        modifier: "cup, chopped",
      }),

      createPortion({
        sourceRowId: "2",

        modifier: "slice",

        gramWeight: 20,
      }),

      createPortion({
        sourceRowId: "3",

        modifier: "oz",

        gramWeight: 28.35,
      }),
    ]),
  ]);

  const first = normalizePortions({
    extracted,
  });

  const second = normalizePortions({
    extracted,
  });

  assert.deepEqual(first, second);
});
